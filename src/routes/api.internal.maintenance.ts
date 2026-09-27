import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { verifyQstash } from "@/server/integrations/qstash.server";
import { processAnalysis, maintainWork } from "@/server/services/ml-service.server";
export const Route = createFileRoute("/api/internal/maintenance")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleApiRoute(request, async () => {
          await verifyQstash(request);
          await maintainWork();
          return new Response(null, { status: 204 });
        }),
    },
  },
});
