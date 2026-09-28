import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { AuthPrincipal } from "../src/server/auth/session.server";
const url = process.env["TEST_DATABASE_URL"];
const suite = url ? describe : describe.skip;
const mail = vi.hoisted(() => ({ send: vi.fn(), configured: true }));
vi.mock("../src/server/db.server", async () => {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return {
    db: new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env["TEST_DATABASE_URL"] }),
    }),
  };
});
vi.mock("../src/server/integrations/brevo.server", async () => {
  const { AppError } = await import("../src/server/errors/app-error.server");
  return {
    sendInvitationEmail: mail.send,
    requireInvitationConfig: () => {
      if (!mail.configured) throw new AppError("INVITATIONS_NOT_CONFIGURED", 503, "not configured");
    },
  };
});

suite("contractor invitations database workflow", () => {
  let db: PrismaClient;
  let service: typeof import("../src/server/services/contractor-service.server");
  let auth: typeof import("../src/server/auth/auth-service.server");
  let admin: AuthPrincipal;
  const input = {
    name: "Company",
    specialty: "Road",
    contact: "Worker",
    phone: "000",
    email: "worker@test.invalid",
    language: "fr" as const,
  };
  const password = "New-password-123";
  const token = () => mail.send.mock.calls.at(-1)![0].token as string;
  beforeAll(async () => {
    if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test"))
      throw new Error("Dedicated local test database required");
    process.env["DATABASE_URL"] = url;
    process.env["SESSION_SECRET"] = "test-session-secret-at-least-32-characters";
    db = (await import("../src/server/db.server")).db;
    service = await import("../src/server/services/contractor-service.server");
    auth = await import("../src/server/auth/auth-service.server");
  });
  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "RepairRequest", "Contractor", "User", "RateBucket" CASCADE',
    );
    mail.send.mockReset().mockResolvedValue("brevo-message-1");
    mail.configured = true;
    const user = await db.user.create({
      data: {
        name: "Admin",
        emailNormalized: "admin@test.invalid",
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    admin = {
      userId: user.id,
      name: user.name,
      email: user.emailNormalized,
      role: "ADMIN",
      contractorId: null,
      client: "WEB",
      sessionId: "test",
    };
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  async function ageInvitation() {
    await db.contractorInvitation.updateMany({ data: { issuedAt: new Date(Date.now() - 61_000) } });
  }

  it("creates a pending account then activates and allows login and assignment", async () => {
    const created = await service.createContractor(input, admin);
    expect(created.delivery).toBe("ACCEPTED");
    const pending = await db.user.findUniqueOrThrow({
      where: { emailNormalized: input.email },
      include: { invitation: true },
    });
    expect(pending.accountActivated).toBe(false);
    await db.user.update({
      where: { id: pending.id },
      data: { passwordHash: await auth.hashPassword(password) },
    });
    const sessions = await import("../src/server/auth/session.server");
    const issued = await sessions.createSession(pending, "WEB");
    expect(
      await sessions.getOptionalPrincipal(
        new Request("https://app.test", { headers: { authorization: `Bearer ${issued.token}` } }),
      ),
    ).toBeNull();
    expect(pending.invitation?.tokenHash).not.toBe(token());
    expect(pending.invitation?.messageId).toBe("brevo-message-1");
    await expect(
      auth.login({ email: input.email, password }, new Request("https://app.test")),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CREDENTIALS" });
    const { assignRequest } = await import("../src/server/services/request-service.server");
    const request = await db.repairRequest.create({
      data: {
        reference: "RR-INVITE",
        trackingTokenHash: "invite",
        problemType: "POTHOLE",
        description: "test",
        latitude: 55,
        longitude: 37,
        status: "VERIFIED",
      },
    });
    await expect(
      assignRequest({ requestId: request.id, contractorId: created.contractorId, actor: admin }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.activateContractor(token(), password);
    expect(
      (await auth.login({ email: input.email, password }, new Request("https://app.test")))
        .principal.contractorId,
    ).toBe(created.contractorId);
    await assignRequest({
      requestId: request.id,
      contractorId: created.contractorId,
      actor: admin,
    });
    expect((await db.repairRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe(
      "ASSIGNED",
    );
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
  });
  it("rolls back the company when a user email already exists", async () => {
    await expect(
      service.createContractor({ ...input, email: admin.email }, admin),
    ).rejects.toMatchObject({ code: "CONTRACTOR_EMAIL_EXISTS" });
    expect(await db.contractor.count()).toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
  });
  it("deduplicates concurrent creates atomically", async () => {
    const results = await Promise.allSettled([
      service.createContractor(input, admin),
      service.createContractor(input, admin),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.contractor.count()).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });
  it("preserves the pending account on delivery failure", async () => {
    mail.send.mockRejectedValueOnce(new Error("timeout"));
    const created = await service.createContractor(input, admin);
    expect(created.delivery).toBe("FAILED");
    expect(await db.contractor.count()).toBe(1);
    await ageInvitation();
    expect((await service.inviteContractor(created.contractorId, "ru", admin)).delivery).toBe(
      "ACCEPTED",
    );
    expect(mail.send.mock.calls.at(-1)![0].language).toBe("ru");
  });
  it("invalidates old links on resend and enforces cooldown", async () => {
    const created = await service.createContractor(input, admin);
    const previous = token();
    await expect(service.inviteContractor(created.contractorId, "fr", admin)).rejects.toMatchObject(
      { code: "RATE_LIMIT_EXCEEDED" },
    );
    await ageInvitation();
    await service.inviteContractor(created.contractorId, "fr", admin);
    await expect(service.activateContractor(previous, password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    await service.activateContractor(token(), password);
  });
  it("allows only one concurrent activation", async () => {
    await service.createContractor(input, admin);
    const results = await Promise.allSettled([
      service.activateContractor(token(), password),
      service.activateContractor(token(), "Another-password-123"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("serializes concurrent resends", async () => {
    const created = await service.createContractor(input, admin);
    await ageInvitation();
    const results = await Promise.allSettled([
      service.inviteContractor(created.contractorId, "fr", admin),
      service.inviteContractor(created.contractorId, "ru", admin),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(mail.send).toHaveBeenCalledTimes(2);
  });
  it("rejects expired links without activating", async () => {
    await service.createContractor(input, admin);
    await db.contractorInvitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { emailNormalized: input.email } }))
        .accountActivated,
    ).toBe(false);
  });
  it("invites an existing company without a user", async () => {
    const { language: _language, ...data } = input;
    const company = await db.contractor.create({ data });
    await service.inviteContractor(company.id, "ru", admin);
    expect(await db.contractor.count()).toBe(1);
    await service.activateContractor(token(), password);
  });
  it("preserves existing activated accounts", async () => {
    const { language: _language, ...data } = input;
    const company = await db.contractor.create({ data });
    const user = await db.user.create({
      data: {
        name: input.contact,
        emailNormalized: input.email,
        passwordHash: await auth.hashPassword(password),
        role: "CONTRACTOR",
        contractorId: company.id,
      },
    });
    expect(user.accountActivated).toBe(true);
    await expect(service.inviteContractor(company.id, "fr", admin)).rejects.toMatchObject({
      code: "CONTRACTOR_ACCOUNT_EXISTS",
    });
    expect(
      (await auth.login({ email: input.email, password }, new Request("https://app.test")))
        .principal.userId,
    ).toBe(user.id);
  });
  it("rejects non admins and missing configuration before writes", async () => {
    await expect(
      service.createContractor(input, { ...admin, role: "CONTRACTOR" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.inviteContractor("missing", "fr", { ...admin, role: "CONTRACTOR" }),
    ).rejects.toMatchObject({ status: 403 });
    mail.configured = false;
    await expect(service.createContractor(input, admin)).rejects.toMatchObject({
      code: "INVITATIONS_NOT_CONFIGURED",
    });
    expect(await db.contractor.count()).toBe(0);
  });
  it("does not reactivate disabled users or companies", async () => {
    const created = await service.createContractor(input, admin);
    await db.contractor.update({ where: { id: created.contractorId }, data: { active: false } });
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    await db.contractor.update({ where: { id: created.contractorId }, data: { active: true } });
    await db.user.updateMany({
      where: { contractorId: created.contractorId },
      data: { active: false },
    });
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
  });
  it("limits resend attempts per hour", async () => {
    const created = await service.createContractor(input, admin);
    for (let i = 0; i < 5; i++) {
      await ageInvitation();
      await service.inviteContractor(created.contractorId, "fr", admin);
    }
    await ageInvitation();
    await expect(service.inviteContractor(created.contractorId, "fr", admin)).rejects.toMatchObject(
      { code: "RATE_LIMIT_EXCEEDED" },
    );
    expect(mail.send).toHaveBeenCalledTimes(6);
  });
  it("lists access metadata without leaking secrets", async () => {
    const created = await service.createContractor(input, admin);
    const { listContractors } =
      await import("../src/server/repositories/request-repository.server");
    const { toContractorDto } = await import("../src/server/mappers/repair-request-mappers.server");
    const list = async () => (await listContractors(db)).map(toContractorDto);
    expect((await list())[0]).toMatchObject({
      id: created.contractorId,
      canAssign: false,
      accessStatus: "PENDING",
      invitation: { delivery: "ACCEPTED" },
    });
    const serialized = JSON.stringify(await list());
    expect(serialized).not.toContain("tokenHash");
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain(token());
    await service.activateContractor(token(), password);
    expect((await list())[0]).toMatchObject({ canAssign: true, accessStatus: "ACTIVE" });
  });
});
