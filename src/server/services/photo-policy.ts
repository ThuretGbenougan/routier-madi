import { ConflictError, ValidationError } from "../errors/app-error.server";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_KIND = 5;

export function assertPhotoAllowed(status: string, kind: string, role: string | null) {
  if (!["citizen", "before", "after"].includes(kind)) {
    throw new ValidationError([
      { path: "kind", code: "PHOTO_KIND_INVALID", message: "Type de photo invalide." },
    ]);
  }
  if (["CLOSED", "REJECTED"].includes(status)) {
    throw new ConflictError("REQUEST_CLOSED", "Cette demande n’accepte plus de photos.");
  }
  if (
    kind !== "citizen" &&
    (role !== "CONTRACTOR" || !["ASSIGNED", "IN_PROGRESS"].includes(status))
  ) {
    throw new ConflictError(
      "PHOTO_KIND_FORBIDDEN",
      "Les photos de chantier sont réservées à l’entreprise affectée pendant l’intervention.",
    );
  }
  if (kind === "citizen" && role === "CONTRACTOR") {
    throw new ConflictError(
      "PHOTO_KIND_FORBIDDEN",
      "Une entreprise ne peut pas ajouter une photo citoyenne.",
    );
  }
}

export function isMlEligible(problemType: string, kind: string, provider: string) {
  return problemType === "POTHOLE" && kind === "CITIZEN" && provider === "cloudinary";
}
