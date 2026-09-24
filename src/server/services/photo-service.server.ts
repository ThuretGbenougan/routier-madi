import { MlAnalysisStatus, PhotoKind } from "../../generated/prisma/client";
import type { AuthPrincipal } from "../auth/session.server";
import { requireRequestAccess } from "../authorization/guards.server";
import { db } from "../db.server";
import { NotFoundError, ValidationError } from "../errors/app-error.server";
import { uploadRoadImage } from "../integrations/cloudinary-client.server";
import { validateImageUpload } from "../integrations/image-validation.server";
import { toAdminRepairRequestDto, toContractorRepairRequestDto } from "../mappers/repair-request-mappers.server";
import { findRequestById } from "../repositories/request-repository.server";
import { verifyPublicRequestAccess } from "./request-service.server";

export async function uploadPhoto(input: { requestId: string; file: File; kind: string | null; actor: AuthPrincipal | null; trackingToken?: string | null; correlationId: string }) {
  const request = await findRequestById(db, input.requestId);
  if (!request) throw new NotFoundError("REQUEST_NOT_FOUND", "Demande introuvable.");
  const kind = input.kind === "before" ? PhotoKind.BEFORE : input.kind === "after" ? PhotoKind.AFTER : PhotoKind.CITIZEN;
  if (input.actor) requireRequestAccess(input.actor, request.contractorId);
  else {
    if (kind !== PhotoKind.CITIZEN || !input.trackingToken) {
      throw new ValidationError([{ path: "trackingToken", message: "Jeton de suivi requis.", code: "TRACKING_TOKEN_REQUIRED" }]);
    }
    await verifyPublicRequestAccess(input.requestId, input.trackingToken);
  }
  if (input.actor?.role === "CONTRACTOR" && kind === PhotoKind.CITIZEN) {
    throw new ValidationError([{ path: "kind", message: "Une entreprise ne peut pas ajouter une photo citoyenne.", code: "PHOTO_KIND_FORBIDDEN" }]);
  }
  const validated = await validateImageUpload(input.file);
  const storage = await uploadRoadImage({ ...validated, requestId: input.correlationId });
  const photo = await db.$transaction(async (tx) => {
    const created = await tx.photo.create({
      data: {
        requestId: request.id,
        kind,
        label: input.file.name.slice(0, 160) || "photo",
        storageProvider: "cloudinary",
        storageKey: storage.key,
        deliveryUrl: storage.deliveryUrl,
        contentType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        width: validated.width,
        height: validated.height,
        sha256: validated.sha256,
      },
    });
    await tx.mlAnalysis.create({ data: { photoId: created.id, status: MlAnalysisStatus.PENDING } });
    return created;
  });
  return { id: photo.id, label: photo.label, kind: photo.kind.toLowerCase() as "citizen" | "before" | "after", seed: photo.id, url: photo.deliveryUrl ?? undefined };
}
