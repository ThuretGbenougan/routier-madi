import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { AuthPrincipal } from "../src/server/auth/session.server";

const url = process.env["TEST_DATABASE_URL"];
const suite = url ? describe : describe.skip;
vi.mock("../src/server/db.server", async () => {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return {
    db: new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env["TEST_DATABASE_URL"] }),
    }),
  };
});
const storage = vi.hoisted(() => ({
  read: vi.fn(),
  sign: vi.fn(() => ({ url: "https://storage.test", fields: {} })),
  remove: vi.fn(),
}));
const ml = vi.hoisted(() => ({ analyze: vi.fn() }));
const queue = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../src/server/integrations/qstash.server", () => ({ qstash: queue.send }));
vi.mock("../src/server/integrations/photo-storage.server", () => ({
  readStoredPhoto: storage.read,
  signPhotoUpload: storage.sign,
  removeStoredPhoto: storage.remove,
}));
vi.mock("../src/server/integrations/ml-client.server", async (original) => ({
  ...(await original<typeof import("../src/server/integrations/ml-client.server")>()),
  analyzeRoadImage: ml.analyze,
}));

suite("database workflow", () => {
  let db: PrismaClient;
  let admin: AuthPrincipal;
  let contractor: AuthPrincipal;
  let requestId: string;
  beforeAll(async () => {
    if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test"))
      throw new Error("Dedicated local test database required");
    process.env["DATABASE_URL"] = url;
    process.env["SESSION_SECRET"] = "test-session-secret-at-least-32-characters";
    process.env["ML_ENABLED"] = "true";
    db = (await import("../src/server/db.server")).db;
  });
  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "RepairRequest", "Contractor", "User", "RateBucket" CASCADE',
    );
    const company = await db.contractor.create({
      data: {
        name: "Test",
        specialty: "Road",
        contact: "Test",
        phone: "000",
        email: "company@test.invalid",
      },
    });
    const a = await db.user.create({
      data: {
        name: "Admin",
        emailNormalized: "admin@test.invalid",
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const c = await db.user.create({
      data: {
        name: "Worker",
        emailNormalized: "worker@test.invalid",
        passwordHash: "unused",
        role: "CONTRACTOR",
        contractorId: company.id,
      },
    });
    admin = {
      userId: a.id,
      name: a.name,
      email: a.emailNormalized,
      role: "ADMIN",
      contractorId: null,
      client: "WEB",
      sessionId: "test",
    };
    contractor = {
      ...admin,
      userId: c.id,
      name: c.name,
      role: "CONTRACTOR",
      contractorId: company.id,
    };
    const request = await db.repairRequest.create({
      data: {
        reference: "RR-TEST",
        trackingTokenHash: "test",
        problemType: "POTHOLE",
        description: "Road needs repair",
        latitude: 55,
        longitude: 37,
        status: "IN_PROGRESS",
        contractorId: company.id,
      },
    });
    requestId = request.id;
    storage.read.mockReset();
    storage.read.mockResolvedValue({
      buffer: Buffer.from("image"),
      file: new File(["image"], "road.png", { type: "image/png" }),
      url: "https://storage.test/road.png",
      mimeType: "image/png",
      sizeBytes: 5,
      width: 10,
      height: 10,
      sha256: "a".repeat(64),
    });
    ml.analyze.mockReset();
    ml.analyze.mockResolvedValue({
      detections: [],
      duration_ms: 10,
      model_version: "test",
      image_width: 10,
      image_height: 10,
      coordinates: "xyxy_pixels",
    });
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  async function addPhoto(kind: "citizen" | "after" = "citizen") {
    const { reservePhoto, completePhoto } =
      await import("../src/server/services/photo-upload-service.server");
    const actor = kind === "after" ? contractor : admin;
    const upload = await reservePhoto({
      requestId,
      actor,
      kind,
      label: "road.png",
      idempotencyKey: randomUUID(),
    });
    return completePhoto({ requestId, actor, uploadId: upload.uploadId });
  }
  it("serializes concurrent reservations at the quota", async () => {
    const { reservePhoto } = await import("../src/server/services/photo-upload-service.server");
    const results = await Promise.allSettled(
      Array.from({ length: 7 }, () =>
        reservePhoto({
          requestId,
          actor: admin,
          kind: "citizen",
          label: "road.png",
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(await db.photoUpload.count()).toBe(5);
  });
  it("confirms twice but stores one photo and one outbox event", async () => {
    const { reservePhoto, completePhoto } =
      await import("../src/server/services/photo-upload-service.server");
    const upload = await reservePhoto({
      requestId,
      actor: admin,
      kind: "citizen",
      label: "road.png",
      idempotencyKey: randomUUID(),
    });
    const input = { requestId, actor: admin, uploadId: upload.uploadId };
    const results = await Promise.all([completePhoto(input), completePhoto(input)]);
    expect(results[0].id).toBe(results[1].id);
    expect(await db.photo.count()).toBe(1);
    expect(await db.mlOutbox.count()).toBe(1);
  });
  it("does not accept another contractor", async () => {
    const { reservePhoto } = await import("../src/server/services/photo-upload-service.server");
    await expect(
      reservePhoto({
        requestId,
        actor: { ...contractor, contractorId: "wrong" },
        kind: "after",
        label: "road.png",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("handles duplicate ML delivery without duplicate inference", async () => {
    const photo = await addPhoto();
    const analysis = await db.mlAnalysis.findUniqueOrThrow({ where: { photoId: photo.id } });
    const { processAnalysis } = await import("../src/server/services/ml-service.server");
    await Promise.all([processAnalysis(analysis.id, 1), processAnalysis(analysis.id, 1)]);
    expect(ml.analyze).toHaveBeenCalledTimes(1);
    expect((await db.mlAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).status).toBe(
      "SUCCEEDED",
    );
  });
  it("retries transient errors and persists terminal failure", async () => {
    const photo = await addPhoto();
    const analysis = await db.mlAnalysis.findUniqueOrThrow({ where: { photoId: photo.id } });
    const { processAnalysis, retryAnalysis } =
      await import("../src/server/services/ml-service.server");
    const { MlError } = await import("../src/server/integrations/ml-client.server");
    ml.analyze.mockRejectedValue(new MlError("ML_NETWORK_TIMEOUT", true));
    for (let n = 0; n < 4; n++) await processAnalysis(analysis.id, 1);
    expect((await db.mlAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).status).toBe(
      "FAILED",
    );
    await retryAnalysis(photo.id);
    const retried = await db.mlAnalysis.findUniqueOrThrow({ where: { id: analysis.id } });
    expect(retried.generation).toBe(2);
    expect(retried.attempts).toBe(0);
    await processAnalysis(analysis.id, 1);
    expect(ml.analyze).toHaveBeenCalledTimes(4);
  });
  it("recovers an expired lease and rejects stale generations", async () => {
    const photo = await addPhoto();
    const analysis = await db.mlAnalysis.findUniqueOrThrow({ where: { photoId: photo.id } });
    await db.mlAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "PROCESSING",
        leaseToken: "dead-worker",
        leaseUntil: new Date(0),
        attempts: 1,
      },
    });
    const { processAnalysis } = await import("../src/server/services/ml-service.server");
    await processAnalysis(analysis.id, 1);
    expect((await db.mlAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).attempts).toBe(
      2,
    );
    expect(ml.analyze).toHaveBeenCalledTimes(1);
  });
  it("rejects expired and foreign upload confirmations", async () => {
    const { reservePhoto, completePhoto } =
      await import("../src/server/services/photo-upload-service.server");
    const upload = await reservePhoto({
      requestId,
      actor: admin,
      kind: "citizen",
      label: "road.png",
      idempotencyKey: randomUUID(),
    });
    await expect(
      completePhoto({ requestId, actor: contractor, uploadId: upload.uploadId }),
    ).rejects.toMatchObject({ status: 404 });
    await db.photoUpload.update({
      where: { id: upload.uploadId },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      completePhoto({ requestId, actor: admin, uploadId: upload.uploadId }),
    ).rejects.toMatchObject({ code: "UPLOAD_EXPIRED" });
    expect(storage.read).not.toHaveBeenCalled();
  });
  it("keeps private notes and ML out of public responses", async () => {
    await addPhoto();
    const { addNote } = await import("../src/server/services/request-service.server");
    await addNote({ requestId, actor: admin, note: { body: "private dispatch note" } });
    const { findRequestById } =
      await import("../src/server/repositories/request-repository.server");
    const { toPublicRepairRequestDto, toContractorRepairRequestDto } =
      await import("../src/server/mappers/repair-request-mappers.server");
    const record = await findRequestById(db, requestId);
    expect(record).not.toBeNull();
    for (const dto of [toPublicRepairRequestDto(record!), toContractorRepairRequestDto(record!)]) {
      expect(dto.dispatcherNotes).toEqual([]);
      expect(dto.photos[0]).not.toHaveProperty("analysis");
      expect(JSON.stringify(dto)).not.toContain("private dispatch note");
    }
  });
  it("keeps uploads successful when queue publication fails", async () => {
    const { getServerEnv } = await import("../src/server/env.server");
    const env = getServerEnv();
    env.PUBLIC_APP_URL = "https://app.test";
    env.QSTASH_TOKEN = "test";
    queue.send.mockRejectedValue(new Error("queue unavailable"));
    try {
      await addPhoto();
      expect(await db.photo.count()).toBe(1);
      const event = await db.mlOutbox.findFirstOrThrow();
      expect(event.publishedAt).toBeNull();
      await db.mlOutbox.update({ where: { id: event.id }, data: { publishingUntil: new Date(0) } });
      queue.send.mockResolvedValue({ messageId: "message-test" });
      const { publishPendingAnalyses } = await import("../src/server/services/ml-service.server");
      await publishPendingAnalyses();
      expect((await db.mlOutbox.findUniqueOrThrow({ where: { id: event.id } })).messageId).toBe(
        "message-test",
      );
    } finally {
      delete env.PUBLIC_APP_URL;
      delete env.QSTASH_TOKEN;
    }
  });
  it("does not let a late worker overwrite a newer result", async () => {
    const photo = await addPhoto();
    const analysis = await db.mlAnalysis.findUniqueOrThrow({ where: { photoId: photo.id } });
    let release: ((value: unknown) => void) | undefined;
    ml.analyze.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { processAnalysis } = await import("../src/server/services/ml-service.server");
    const first = processAnalysis(analysis.id, 1);
    await vi.waitFor(() => expect(release).toBeDefined());
    await db.mlAnalysis.update({ where: { id: analysis.id }, data: { leaseUntil: new Date(0) } });
    await processAnalysis(analysis.id, 1);
    release!({
      detections: [],
      duration_ms: 999,
      model_version: "stale",
      image_width: 10,
      image_height: 10,
    });
    await first;
    const current = await db.mlAnalysis.findUniqueOrThrow({ where: { id: analysis.id } });
    expect(current.modelVersion).toBe("test");
    expect(current.durationMs).toBe(10);
  });
  it("requires fresh evidence after a negative control", async () => {
    const { transitionRequest } = await import("../src/server/services/workflow-service.server");
    await expect(
      transitionRequest({
        requestId,
        actor: contractor,
        to: "COMPLETED",
        comment: "Completed work",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await addPhoto("after");
    await transitionRequest({
      requestId,
      actor: contractor,
      to: "COMPLETED",
      comment: "Completed work",
    });
    await expect(
      transitionRequest({ requestId, actor: admin, to: "CONTROLLED", controlPassed: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await transitionRequest({
      requestId,
      actor: admin,
      to: "IN_PROGRESS",
      comment: "Repair again",
      controlPassed: false,
    });
    await expect(
      transitionRequest({
        requestId,
        actor: contractor,
        to: "COMPLETED",
        comment: "Completed work",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await addPhoto("after");
    await transitionRequest({
      requestId,
      actor: contractor,
      to: "COMPLETED",
      comment: "Completed again",
    });
    await transitionRequest({ requestId, actor: admin, to: "CONTROLLED", controlPassed: true });
    await transitionRequest({ requestId, actor: admin, to: "CLOSED" });
    expect(await db.controlResult.count()).toBe(2);
    expect((await db.repairRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(
      "CLOSED",
    );
  });
  it("shares rate limits across concurrent calls", async () => {
    const { enforceRateLimit } = await import("../src/server/security/request-security.server");
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => enforceRateLimit("test", 5, 60000)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
  });
});
