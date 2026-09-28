import { createFileRoute } from "@tanstack/react-router";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse } from "@/server/security/request-security.server";
import { getPublicStats } from "@/server/services/public-stats-service.server";

export const Route = createFileRoute("/api/v1/public/stats")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request }) =>
        handleApiRoute(request, async ({ requestId }) =>
          jsonResponse(await getPublicStats(), requestId),
        ),
    },
  },
});
