import { createFileRoute } from "@tanstack/react-router";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  preflightResponse,
  requireTrustedMutationOrigin,
  enforceRateLimit,
  clientIp,
} from "@/server/security/request-security.server";
import { activateContractor } from "@/server/services/contractor-service.server";
import { activationSchema } from "@/server/validation/contractor-schemas.server";

export const Route = createFileRoute("/api/v1/auth/activate")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          requireTrustedMutationOrigin(request);
          await enforceRateLimit(`activation:${clientIp(request)}`, 10, 15 * 60_000);
          const input = activationSchema.parse(await parseJsonBody(request));
          await activateContractor(input.token, input.password);
          return jsonResponse({ activated: true }, requestId);
        }),
    },
  },
});
