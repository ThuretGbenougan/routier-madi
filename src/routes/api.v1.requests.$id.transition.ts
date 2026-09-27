import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  preflightResponse,
  requireTrustedMutationOrigin,
} from "@/server/security/request-security.server";
import { getRequestForPrincipal } from "@/server/services/request-service.server";
import { transitionRequest } from "@/server/services/workflow-service.server";
import { transitionSchema } from "@/server/validation/request-schemas.server";

export const Route = createFileRoute("/api/v1/requests/$id/transition")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          requireTrustedMutationOrigin(request);
          const actor = await requirePrincipal(request);
          const input = transitionSchema.parse(await parseJsonBody(request));
          await transitionRequest({ requestId: params.id, actor, ...input });
          return jsonResponse(
            { request: await getRequestForPrincipal(params.id, actor) },
            requestId,
          );
        }),
    },
  },
});
