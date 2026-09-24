import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal, toSessionDto } from "@/server/auth/session.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse } from "@/server/security/request-security.server";

export const Route = createFileRoute("/api/v1/auth/me")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request }) => handleApiRoute(request, async ({ request, requestId }) => {
        return jsonResponse({ session: toSessionDto(await requirePrincipal(request)) }, requestId);
      }),
    },
  },
});
