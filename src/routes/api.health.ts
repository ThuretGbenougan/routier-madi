import { createFileRoute } from "@tanstack/react-router";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse } from "@/server/security/request-security.server";

export const Route = createFileRoute("/api/health")({
  server: { handlers: {
    OPTIONS: ({ request }) => preflightResponse(request),
    GET: ({ request }) => handleApiRoute(request, async ({ requestId }) => jsonResponse({ status: "ok" }, requestId)),
  } },
});
