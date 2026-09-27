import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { verifyQstash } from "@/server/integrations/qstash.server";
import { processAnalysis, maintainWork } from "@/server/services/ml-service.server";
export const Route = createFileRoute("/api/internal/ml/process")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleApiRoute(request, async () => {
          const body = z
            .object({ analysisId: z.string().cuid(), generation: z.number().int().positive() })
            .parse(JSON.parse(await verifyQstash(request)));
          const result = await processAnalysis(body.analysisId, body.generation);
          return new Response(null, {
            status: result.retry ? 503 : 204,
            headers: result.retry ? { "retry-after": "60" } : {},
          });
        }),
    },
  },
});
