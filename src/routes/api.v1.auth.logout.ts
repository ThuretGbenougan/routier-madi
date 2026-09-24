import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, revokeSession } from "@/server/auth/session.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse, requireTrustedMutationOrigin } from "@/server/security/request-security.server";

export const Route = createFileRoute("/api/v1/auth/logout")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request }) => handleApiRoute(request, async ({ request, requestId }) => {
        requireTrustedMutationOrigin(request);
        await revokeSession(request);
        return jsonResponse({ ok: true }, requestId, 200, { "set-cookie": clearSessionCookie() });
      }),
    },
  },
});
