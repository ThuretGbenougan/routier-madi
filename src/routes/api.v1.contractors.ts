import { invitationsConfigured } from "@/server/integrations/brevo.server";
import { createContractor } from "@/server/services/contractor-service.server";
import { contractorSchema } from "@/server/validation/contractor-schemas.server";
import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireAdmin } from "@/server/authorization/guards.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { toContractorDto } from "@/server/mappers/repair-request-mappers.server";
import { listContractors } from "@/server/repositories/request-repository.server";
import { db } from "@/server/db.server";
import {
  preflightResponse,
  requireTrustedMutationOrigin,
  enforceRateLimit,
} from "@/server/security/request-security.server";

export const Route = createFileRoute("/api/v1/contractors")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          const actor = await requirePrincipal(request);
          requireAdmin(actor);
          requireTrustedMutationOrigin(request);
          await enforceRateLimit(`contractor-create:${actor.userId}`, 20, 60 * 60_000);
          const result = await createContractor(
            contractorSchema.parse(await parseJsonBody(request)),
            actor,
          );
          return jsonResponse(result, requestId, 201);
        }),
      GET: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          requireAdmin(await requirePrincipal(request));
          return jsonResponse(
            {
              contractors: (await listContractors(db)).map(toContractorDto),
              invitationsEnabled: invitationsConfigured(),
            },
            requestId,
          );
        }),
    },
  },
});
