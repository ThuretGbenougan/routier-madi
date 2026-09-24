import { z } from "zod";
import { ExternalServiceError } from "../errors/app-error.server";
import { getServerEnv } from "../env.server";

const mlResponseSchema = z.object({
  detections: z.array(z.object({
    label: z.string().max(100),
    confidence: z.number().min(0).max(1),
    box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  })),
  duration_ms: z.number().nonnegative(),
});

/** Calls the external pothole detector only from the server. */
export async function analyzeRoadImage(file: File, requestId: string) {
  const env = getServerEnv();
  if (!env.ML_API_URL || !env.ML_API_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const form = new FormData();
    form.set("image", file);
    const response = await fetch(`${env.ML_API_URL.replace(/\/$/, "")}/detect`, {
      method: "POST",
      headers: { "x-api-key": env.ML_API_KEY, "x-request-id": requestId },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`ml_status_${response.status}`);
    return mlResponseSchema.parse(await response.json());
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", event: "ml_analysis_failed", requestId, errorName: error instanceof Error ? error.name : "UnknownError" }));
    throw new ExternalServiceError("ML_SERVICE_UNAVAILABLE", "L'analyse automatique est temporairement indisponible.");
  } finally {
    clearTimeout(timeout);
  }
}
