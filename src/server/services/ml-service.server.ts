import { randomUUID } from "node:crypto";
import { db } from "../db.server";
import { getServerEnv } from "../env.server";
import { qstash } from "../integrations/qstash.server";
import { analyzeRoadImage, MlError } from "../integrations/ml-client.server";
import { readStoredPhoto, removeStoredPhoto } from "../integrations/photo-storage.server";
import { ConflictError, NotFoundError, ValidationError } from "../errors/app-error.server";
import { enforceRateLimit } from "../security/request-security.server";

export async function publishPendingAnalyses(limit = 10) {
  const env = getServerEnv();
  if (env.ML_ENABLED !== "true" || !env.PUBLIC_APP_URL || !env.QSTASH_TOKEN) return;
  const rows = await db.mlOutbox.findMany({
    where: {
      publishedAt: null,
      OR: [{ publishingUntil: null }, { publishingUntil: { lt: new Date() } }],
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });
  for (const row of rows) {
    const claimed = await db.mlOutbox.updateMany({
      where: {
        id: row.id,
        publishedAt: null,
        OR: [{ publishingUntil: null }, { publishingUntil: { lt: new Date() } }],
      },
      data: { publishingUntil: new Date(Date.now() + 60_000) },
    });
    if (!claimed.count) continue;
    try {
      await enforceRateLimit("ml-publications", 180, 24 * 60 * 60_000);
      const destination = `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/api/internal/ml/process`;
      const result = await qstash(
        `enqueue/routier-ml/${destination}`,
        { analysisId: row.analysisId, generation: row.generation },
        {
          "Upstash-Retries": "3",
          "Upstash-Retry-Delay": "60000 * pow(2, retried)",
          "Upstash-Timeout": "180s",
          "Upstash-Deduplication-Id": `${row.analysisId}-${row.generation}`,
        },
      );
      await db.mlOutbox.update({
        where: { id: row.id },
        data: { messageId: result.messageId, publishedAt: new Date(), publishingUntil: null },
      });
    } catch (error) {
      await db.mlOutbox.update({
        where: { id: row.id },
        data: { publishingUntil: new Date(Date.now() + 15 * 60_000) },
      });
      console.warn(
        JSON.stringify({
          event: "ml_publish_deferred",
          analysisId: row.analysisId,
          errorName: error instanceof Error ? error.name : "Error",
        }),
      );
      break;
    }
  }
}

export async function processAnalysis(analysisId: string, generation: number) {
  if (getServerEnv().ML_ENABLED !== "true") return { retry: true };
  const token = randomUUID();
  const claimed = await db.mlAnalysis.updateMany({
    where: {
      id: analysisId,
      generation,
      attempts: { lt: 4 },
      OR: [{ status: "PENDING" }, { status: "PROCESSING", leaseUntil: { lt: new Date() } }],
    },
    data: {
      status: "PROCESSING",
      leaseToken: token,
      leaseUntil: new Date(Date.now() + 210_000),
      attempts: { increment: 1 },
    },
  });
  if (!claimed.count) {
    const current = await db.mlAnalysis.findUnique({ where: { id: analysisId } });
    if (current?.generation === generation && current.status === "PROCESSING")
      return { retry: true };
    return { retry: false };
  }
  const analysis = await db.mlAnalysis.findUniqueOrThrow({
    where: { id: analysisId },
    include: { photo: true },
  });
  try {
    const stored = await readStoredPhoto(analysis.photo.storageKey);
    const result = await analyzeRoadImage(stored.file, analysisId);
    await db.$transaction(async (tx) => {
      const updated = await tx.mlAnalysis.updateMany({
        where: { id: analysisId, generation, leaseToken: token, status: "PROCESSING" },
        data: {
          status: "SUCCEEDED",
          failureCode: null,
          modelVersion: result.model_version,
          durationMs: result.duration_ms,
          imageWidth: result.image_width,
          imageHeight: result.image_height,
          leaseToken: null,
          leaseUntil: null,
        },
      });
      if (!updated.count) return;
      await tx.mlDetection.deleteMany({ where: { analysisId } });
      if (result.detections.length)
        await tx.mlDetection.createMany({
          data: result.detections.map((d) => ({
            analysisId,
            label: d.label,
            confidence: d.confidence,
            x1: d.box[0],
            y1: d.box[1],
            x2: d.box[2],
            y2: d.box[3],
          })),
        });
    });
    console.info(
      JSON.stringify({
        event: "ml_succeeded",
        analysisId,
        photoId: analysis.photoId,
        requestId: analysis.photo.requestId,
        durationMs: result.duration_ms,
      }),
    );
    return { retry: false };
  } catch (error) {
    const failure =
      error instanceof MlError
        ? error
        : new MlError(
            error instanceof ValidationError ? "PHOTO_INVALID_IMAGE" : "ML_STORAGE_UNAVAILABLE",
            !(error instanceof ValidationError),
          );
    const retry = failure.retryable && analysis.attempts < 4;
    await db.mlAnalysis.updateMany({
      where: { id: analysisId, generation, leaseToken: token },
      data: {
        status: retry ? "PENDING" : "FAILED",
        failureCode: failure.code,
        leaseToken: null,
        leaseUntil: null,
      },
    });
    console.warn(
      JSON.stringify({
        event: "ml_failed",
        analysisId,
        requestId: analysis.photo.requestId,
        code: failure.code,
        attempt: analysis.attempts,
      }),
    );
    return { retry };
  }
}

export async function retryAnalysis(photoId: string) {
  await db.$transaction(async (tx) => {
    const current = await tx.mlAnalysis.findUnique({ where: { photoId } });
    if (!current) throw new NotFoundError();
    const result = await tx.mlAnalysis.updateMany({
      where: { id: current.id, generation: current.generation, status: "FAILED" },
      data: {
        generation: { increment: 1 },
        attempts: 0,
        status: "PENDING",
        failureCode: null,
        leaseToken: null,
        leaseUntil: null,
      },
    });
    if (!result.count)
      throw new ConflictError("ML_NOT_RETRYABLE", "Seule une analyse échouée peut être relancée.");
    await tx.mlOutbox.deleteMany({ where: { analysisId: current.id } });
    await tx.mlOutbox.create({
      data: { analysisId: current.id, generation: current.generation + 1 },
    });
  });
  await publishPendingAnalyses(1);
}

export async function maintainWork() {
  const deadline = Date.now() + 140_000;
  await db.mlAnalysis.updateMany({
    where: { status: "PROCESSING", leaseUntil: { lt: new Date() }, attempts: { gte: 4 } },
    data: {
      status: "FAILED",
      failureCode: "ML_ATTEMPTS_EXHAUSTED",
      leaseToken: null,
      leaseUntil: null,
    },
  });
  // Check the transport before recovering an abandoned delivery; queued messages may legitimately wait.
  const sent = await db.mlOutbox.findMany({
    where: {
      publishedAt: { lt: new Date(Date.now() - 20 * 60_000) },
      analysis: { status: { in: ["PENDING", "PROCESSING"] } },
    },
    take: 20,
  });
  for (const row of sent) {
    if (Date.now() >= deadline) break;
    if (!row.messageId) continue;
    try {
      await qstash(`messages/${row.messageId}`, undefined, undefined, "GET");
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "QSTASH_HTTP_404") continue;
      if (getServerEnv().ML_ENABLED !== "true") continue;
      await db.$transaction(async (tx) => {
        const recovered = await tx.mlAnalysis.updateMany({
          where: {
            id: row.analysisId,
            generation: row.generation,
            attempts: { lt: 4 },
            status: { in: ["PENDING", "PROCESSING"] },
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
          },
          data: {
            status: "PENDING",
            failureCode: "ML_DELIVERY_INTERRUPTED",
            leaseToken: null,
            leaseUntil: null,
          },
        });
        if (recovered.count)
          await tx.mlOutbox.update({
            where: { id: row.id },
            data: { messageId: null, publishedAt: null, publishingUntil: null },
          });
      });
    }
  }
  if (Date.now() < deadline - 30_000) await publishPendingAnalyses(5);
  const expired = await db.photoUpload.findMany({
    where: {
      photoId: null,
      cleanedAt: null,
      expiresAt: { lt: new Date(Date.now() - 60 * 60_000) },
    },
    take: 20,
  });
  for (const upload of expired) {
    if (Date.now() >= deadline) break;
    await removeStoredPhoto(upload.storageKey);
    await db.photoUpload.update({ where: { id: upload.id }, data: { cleanedAt: new Date() } });
  }
  await db.rateBucket.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
}
