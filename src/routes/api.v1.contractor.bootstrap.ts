import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireContractor } from "@/server/authorization/guards.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse } from "@/server/security/request-security.server";
import { getBootstrap } from "@/server/services/request-service.server";

export const Route = createFileRoute("/api/v1/contractor/bootstrap")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request }) => handleApiRoute(request, async ({ request, requestId }) => {
        const principal = await requirePrincipal(request);
        requireContractor(principal);
        return jsonResponse(await getBootstrap(principal), requestId);
      }),
    },
  },
});
