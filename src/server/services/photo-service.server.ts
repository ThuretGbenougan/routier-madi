import { createHash } from "node:crypto";
import type { AuthPrincipal } from "../auth/session.server";
import { db } from "../db.server";
import { ValidationError } from "../errors/app-error.server";
import { uploadRoadImage } from "../integrations/cloudinary-client.server";
import { validateImageUpload } from "../integrations/image-validation.server";
import { reservePhoto, completePhoto } from "./photo-upload-service.server";

/** Compatibility transport for previously distributed desktop clients. */
export async function uploadPhoto(input: {
  requestId: string;
  file: File;
  kind: string | null;
  actor: AuthPrincipal | null;
  trackingToken?: string | null;
  correlationId: string;
}) {
  if (input.file.size > 4 * 1024 * 1024)
    throw new ValidationError([
      {
        path: "image",
        code: "PHOTO_TOO_LARGE",
        message:
          "Ce client accepte des photos de 4 Mo maximum. Mettez l’application à jour pour envoyer 8 Mo.",
      },
    ]);
  const validated = await validateImageUpload(input.file);
  const digest = createHash("sha256").update(`${input.kind}:${validated.sha256}`).digest("hex");
  const idempotencyKey = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const reservation = await reservePhoto({
    ...input,
    kind: input.kind ?? "citizen",
    label: input.file.name.slice(0, 160) || "photo",
    idempotencyKey,
  });
  if (!reservation.confirmed) {
    const upload = await db.photoUpload.findUniqueOrThrow({ where: { id: reservation.uploadId } });
    await uploadRoadImage({
      ...validated,
      requestId: input.correlationId,
      storageKey: upload.storageKey,
    });
  }
  return completePhoto({ ...input, uploadId: reservation.uploadId });
}
