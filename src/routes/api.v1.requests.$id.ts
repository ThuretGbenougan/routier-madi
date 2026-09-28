import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse } from "@/server/security/request-security.server";
import { getRequestForPrincipal } from "@/server/services/request-service.server";

export const Route = createFileRoute("/api/v1/requests/$id")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request, params }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          return jsonResponse(
            { request: await getRequestForPrincipal(params.id, await requirePrincipal(request)) },
            requestId,
          );
        }),
    },
  },
});
