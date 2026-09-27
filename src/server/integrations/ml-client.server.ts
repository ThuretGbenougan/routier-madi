import { z } from "zod";
import { getServerEnv } from "../env.server";

export const mlResponseSchema = z
  .object({
    detections: z
      .array(
        z.object({
          label: z.string().min(1).max(100),
          confidence: z.number().finite().min(0).max(1),
          box: z.tuple([
            z.number().finite(),
            z.number().finite(),
            z.number().finite(),
            z.number().finite(),
          ]),
        }),
      )
      .max(1000),
    duration_ms: z.number().finite().nonnegative(),
    model_version: z.string().min(1).max(128),
    image_width: z.number().int().positive().max(8000),
    image_height: z.number().int().positive().max(8000),
    coordinates: z.literal("xyxy_pixels"),
  })
  .superRefine((result, ctx) => {
    for (const {
      box: [x1, y1, x2, y2],
    } of result.detections) {
      if (
        x1 < 0 ||
        y1 < 0 ||
        x2 < x1 ||
        y2 < y1 ||
        x2 > result.image_width ||
        y2 > result.image_height
      )
        ctx.addIssue({ code: "custom", message: "Invalid detection bounds" });
    }
  });

export class MlError extends Error {
  constructor(
    public code: string,
    public retryable: boolean,
  ) {
    super(code);
  }
}

export async function analyzeRoadImage(file: File, requestId: string) {
  const env = getServerEnv();
  if (!env.ML_API_URL || !env.ML_API_KEY) throw new MlError("ML_NOT_CONFIGURED", false);
  const form = new FormData();
  form.set("file", file);
  let response: Response;
  try {
    response = await fetch(`${env.ML_API_URL.replace(/\/$/, "")}/detect`, {
      method: "POST",
      headers: { "x-api-key": env.ML_API_KEY, "x-request-id": requestId },
      body: form,
      signal: AbortSignal.timeout(120_000),
      redirect: "error",
    });
    if (!response.ok)
      throw new MlError(
        `ML_HTTP_${response.status}`,
        response.status >= 500 || [408, 429].includes(response.status),
      );
    const result = mlResponseSchema.safeParse(await response.json());
    if (!result.success) throw new MlError("ML_INVALID_RESPONSE", false);
    return result.data;
  } catch (error) {
    if (error instanceof MlError) throw error;
    if (error instanceof SyntaxError) throw new MlError("ML_INVALID_RESPONSE", false);
    throw new MlError("ML_NETWORK_TIMEOUT", true);
  }
}
