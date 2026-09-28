import { randomUUID } from "node:crypto";
import { PhotoKind } from "../../generated/prisma/client";
import { db } from "../db.server";
import type { AuthPrincipal } from "../auth/session.server";
import { requireRequestAccess } from "../authorization/guards.server";
import { ConflictError, NotFoundError } from "../errors/app-error.server";
import { verifyPublicRequestAccess } from "./request-service.server";
import { assertPhotoAllowed, isMlEligible, MAX_PHOTOS_PER_KIND } from "./photo-policy";
import { readStoredPhoto, signPhotoUpload } from "../integrations/photo-storage.server";
import { publishPendingAnalyses } from "./ml-service.server";

type Access = {
  requestId: string;
  actor: AuthPrincipal | null;
  trackingToken?: string | null | undefined;
};

async function access(input: Access) {
  const request = await db.repairRequest.findUnique({ where: { id: input.requestId } });
  if (!request) throw new NotFoundError();
  if (input.actor) requireRequestAccess(input.actor, request.contractorId);
  else await verifyPublicRequestAccess(input.requestId, input.trackingToken ?? "");
  return input.actor?.userId ?? `citizen:${input.requestId}`;
}

export async function reservePhoto(
  input: Access & { kind: string; label: string; idempotencyKey: string },
) {
  const actorKey = await access(input);
  const upload = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RepairRequest" WHERE "id" = ${input.requestId} FOR UPDATE`;
    const request = await tx.repairRequest.findUniqueOrThrow({ where: { id: input.requestId } });
    if (input.actor) requireRequestAccess(input.actor, request.contractorId);
    assertPhotoAllowed(request.status, input.kind, input.actor?.role ?? null);
    const existing = await tx.photoUpload.findUnique({
      where: {
        requestId_actorKey_idempotencyKey: {
          requestId: input.requestId,
          actorKey,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.kind.toLowerCase() !== input.kind)
        throw new ConflictError(
          "UPLOAD_KEY_REUSED",
          "Cette clé est déjà utilisée pour une autre photo.",
        );
      if (existing.photoId) return existing;
      if (existing.expiresAt <= new Date())
        throw new ConflictError(
          "UPLOAD_EXPIRED",
          "L’autorisation d’envoi a expiré. Sélectionnez à nouveau la photo.",
        );
      return existing;
    }
    const kind = input.kind.toUpperCase() as PhotoKind;
    const cycle = request.interventionCycle;
    const scope = { requestId: request.id, kind, ...(kind === "CITIZEN" ? {} : { cycle }) };
    const count = await tx.photo.count({ where: scope });
    const reserved = await tx.photoUpload.count({
      where: { ...scope, photoId: null, expiresAt: { gt: new Date() } },
    });
    if (count + reserved >= MAX_PHOTOS_PER_KIND)
      throw new ConflictError("PHOTO_LIMIT_REACHED", "Le nombre maximal de photos est atteint.");
    return tx.photoUpload.create({
      data: {
        requestId: request.id,
        actorKey,
        kind,
        cycle,
        label: input.label,
        idempotencyKey: input.idempotencyKey,
        storageKey: `routier-madi/requests/${request.id}/${randomUUID()}`,
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });
  });
  return {
    uploadId: upload.id,
    expiresAt: upload.expiresAt.toISOString(),
    confirmed: Boolean(upload.photoId),
    ...(upload.photoId ? {} : signPhotoUpload(upload.storageKey)),
  };
}

export async function completePhoto(input: Access & { uploadId: string }) {
  const actorKey = await access(input);
  const upload = await db.photoUpload.findUnique({
    where: { id: input.uploadId },
    include: { photo: true },
  });
  if (!upload || upload.requestId !== input.requestId || upload.actorKey !== actorKey)
    throw new NotFoundError();
  if (upload.photo) return photoDto(upload.photo);
  if (upload.expiresAt <= new Date())
    throw new ConflictError("UPLOAD_EXPIRED", "L’autorisation d’envoi a expiré.");
  const stored = await readStoredPhoto(upload.storageKey);
  const photo = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "RepairRequest" WHERE "id" = ${input.requestId} FOR UPDATE`;
      const current = await tx.photoUpload.findUniqueOrThrow({
        where: { id: upload.id },
        include: { photo: true },
      });
      if (current.photo) return current.photo;
      if (current.expiresAt <= new Date() || current.cleanedAt)
        throw new ConflictError("UPLOAD_EXPIRED", "L’autorisation d’envoi a expiré.");
      const request = await tx.repairRequest.findUniqueOrThrow({ where: { id: input.requestId } });
      if (input.actor) requireRequestAccess(input.actor, request.contractorId);
      assertPhotoAllowed(request.status, current.kind.toLowerCase(), input.actor?.role ?? null);
      if (current.kind !== "CITIZEN" && current.cycle !== request.interventionCycle)
        throw new ConflictError(
          "UPLOAD_STALE_CYCLE",
          "Cette photo appartient à une intervention précédente.",
        );
      const created = await tx.photo.create({
        data: {
          requestId: request.id,
          kind: current.kind,
          cycle: current.cycle,
          label: current.label,
          storageKey: current.storageKey,
          storageProvider: "cloudinary",
          deliveryUrl: stored.url,
          contentType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          width: stored.width,
          height: stored.height,
          sha256: stored.sha256,
          analysis: {
            create: {
              status: isMlEligible(request.problemType, current.kind, "cloudinary")
                ? "PENDING"
                : "SKIPPED",
            },
          },
        },
        include: { analysis: true },
      });
      await tx.photoUpload.update({ where: { id: current.id }, data: { photoId: created.id } });
      if (created.analysis?.status === "PENDING")
        await tx.mlOutbox.create({ data: { analysisId: created.analysis.id, generation: 1 } });
      return created;
    },
    { timeout: 10_000 },
  );
  // Publication is bounded and awaited. A failure remains recoverable in the outbox.
  await publishPendingAnalyses(1).catch(() => undefined);
  return photoDto(photo);
}

export function photoDto(photo: {
  id: string;
  kind: string;
  label: string;
  deliveryUrl: string | null;
}) {
  return {
    id: photo.id,
    kind: photo.kind.toLowerCase() as "citizen" | "before" | "after",
    label: photo.label,
    seed: photo.id,
    url: photo.deliveryUrl ?? undefined,
  };
}
