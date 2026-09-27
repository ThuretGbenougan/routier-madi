import { v2 as cloudinary } from "cloudinary";
import { getServerEnv } from "../env.server";
import { ExternalServiceError, ValidationError } from "../errors/app-error.server";
import { validateImageUpload } from "./image-validation.server";

function storage() {
  const env = getServerEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new ExternalServiceError(
      "STORAGE_SERVICE_UNAVAILABLE",
      "Le stockage des images n’est pas configuré.",
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 5000,
  });
  return env;
}

export function signPhotoUpload(storageKey: string) {
  const env = storage();
  if (!env.CLOUDINARY_UPLOAD_PRESET)
    throw new ExternalServiceError(
      "STORAGE_SERVICE_UNAVAILABLE",
      "La configuration d’envoi des images est incomplète.",
    );
  const parameters = {
    timestamp: Math.floor(Date.now() / 1000),
    public_id: storageKey,
    overwrite: false,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
    allowed_formats: "jpg,jpeg,png,webp",
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    fields: {
      ...parameters,
      api_key: env.CLOUDINARY_API_KEY!,
      signature: cloudinary.utils.api_sign_request(parameters, env.CLOUDINARY_API_SECRET!),
    },
  };
}

export async function readStoredPhoto(storageKey: string) {
  storage();
  const asset = await cloudinary.api.resource(storageKey, {
    resource_type: "image",
    type: "upload",
  });
  if (
    asset.public_id !== storageKey ||
    asset.resource_type !== "image" ||
    !["jpg", "jpeg", "png", "webp"].includes(asset.format) ||
    asset.bytes > 8 * 1024 * 1024
  ) {
    throw new ValidationError([
      { code: "PHOTO_INVALID_IMAGE", message: "Le fichier stocké est invalide." },
    ]);
  }
  // Derive the address from our own key; never fetch an URL supplied by the client.
  const url = cloudinary.url(storageKey, {
    secure: true,
    resource_type: "image",
    type: "upload",
    version: asset.version,
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  if (!response.ok || !response.body)
    throw new ExternalServiceError(
      "STORAGE_SERVICE_UNAVAILABLE",
      "L’image stockée est indisponible.",
    );
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8 * 1024 * 1024) {
      await reader.cancel();
      throw new ValidationError([{ code: "PHOTO_TOO_LARGE", message: "L’image dépasse 8 Mo." }]);
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  const mime =
    asset.format === "jpg" || asset.format === "jpeg" ? "image/jpeg" : `image/${asset.format}`;
  const file = new File([bytes], "image", { type: mime });
  const validated = await validateImageUpload(file);
  return { ...validated, file, url };
}

export async function removeStoredPhoto(storageKey: string) {
  storage();
  await cloudinary.uploader.destroy(storageKey, { resource_type: "image", invalidate: true });
}
