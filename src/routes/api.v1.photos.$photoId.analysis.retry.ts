import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireAdmin } from "@/server/authorization/guards.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  enforceRateLimit,
  preflightResponse,
  requireTrustedMutationOrigin,
} from "@/server/security/request-security.server";
import { retryAnalysis } from "@/server/services/ml-service.server";
export const Route = createFileRoute("/api/v1/photos/$photoId/analysis/retry")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) =>
        handleApiRoute(request, async ({ requestId }) => {
          requireTrustedMutationOrigin(request);
          const actor = requireAdmin(await requirePrincipal(request));
          await enforceRateLimit(`ml-retry:${actor.userId}`, 20, 60 * 60_000);
          await retryAnalysis(params.photoId);
          return jsonResponse({ accepted: true }, requestId, 202);
        }),
    },
  },
});
