import { v2 as cloudinary } from "cloudinary";
import { ExternalServiceError } from "../errors/app-error.server";
import { getServerEnv } from "../env.server";

export async function uploadRoadImage(input: {
  buffer: Buffer;
  mimeType: string;
  requestId: string;
  sha256: string;
  storageKey?: string;
}) {
  const env = getServerEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new ExternalServiceError(
      "STORAGE_SERVICE_UNAVAILABLE",
      "Le stockage des images n'est pas configure.",
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  try {
    return await new Promise<{ key: string; deliveryUrl: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id:
            input.storageKey ??
            `routier-madi/requests/${input.requestId}-${input.sha256.slice(0, 16)}`,
          resource_type: "image",
          overwrite: false,
          invalidate: false,
        },
        (error, result) => {
          if (error || !result?.public_id || !result.secure_url)
            reject(error ?? new Error("cloudinary_invalid_response"));
          else resolve({ key: result.public_id, deliveryUrl: result.secure_url });
        },
      );
      stream.end(input.buffer);
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "storage_upload_failed",
        requestId: input.requestId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    throw new ExternalServiceError(
      "STORAGE_SERVICE_UNAVAILABLE",
      "Le stockage des images est temporairement indisponible.",
    );
  }
}
