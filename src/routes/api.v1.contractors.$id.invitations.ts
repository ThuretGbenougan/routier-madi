import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireAdmin } from "@/server/authorization/guards.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  preflightResponse,
  requireTrustedMutationOrigin,
} from "@/server/security/request-security.server";
import { inviteContractor } from "@/server/services/contractor-service.server";
import { invitationSchema } from "@/server/validation/contractor-schemas.server";

export const Route = createFileRoute("/api/v1/contractors/$id/invitations")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          const actor = await requirePrincipal(request);
          requireAdmin(actor);
          requireTrustedMutationOrigin(request);
          const input = invitationSchema.parse(await parseJsonBody(request));
          return jsonResponse(await inviteContractor(params.id, input.language, actor), requestId);
        }),
    },
  },
});
