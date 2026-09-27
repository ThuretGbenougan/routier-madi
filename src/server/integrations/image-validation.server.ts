import { createHash } from "node:crypto";
import { imageSize } from "image-size";
import { ValidationError } from "../errors/app-error.server";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 8_000;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectedMimeType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return "image/jpeg";
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function validateImageUpload(file: File) {
  if (!acceptedMimeTypes.has(file.type)) {
    throw new ValidationError([
      {
        path: "image",
        message: "Seuls les fichiers JPEG, PNG et WEBP sont acceptes.",
        code: "PHOTO_INVALID_TYPE",
      },
    ]);
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new ValidationError([
      { path: "image", message: "L'image doit peser au maximum 8 Mo.", code: "PHOTO_TOO_LARGE" },
    ]);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectedMimeType(buffer);
  if (!mimeType || mimeType !== file.type) {
    throw new ValidationError([
      {
        path: "image",
        message: "Le contenu du fichier image est invalide.",
        code: "PHOTO_INVALID_TYPE",
      },
    ]);
  }
  try {
    const dimensions = imageSize(buffer);
    if (
      !dimensions.width ||
      !dimensions.height ||
      dimensions.width > MAX_DIMENSION ||
      dimensions.height > MAX_DIMENSION
    ) {
      throw new Error("invalid_dimensions");
    }
    return {
      buffer,
      mimeType,
      sizeBytes: buffer.byteLength,
      width: dimensions.width,
      height: dimensions.height,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    };
  } catch {
    throw new ValidationError([
      {
        path: "image",
        message: "L'image est corrompue ou ses dimensions sont invalides.",
        code: "PHOTO_INVALID_IMAGE",
      },
    ]);
  }
}
