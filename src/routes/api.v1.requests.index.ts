import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { clientIp, enforceRateLimit, preflightResponse, requireTrustedMutationOrigin } from "@/server/security/request-security.server";
import { createPublicRequest, listRequestsForPrincipal } from "@/server/services/request-service.server";
import { createRequestSchema, requestListSchema } from "@/server/validation/request-schemas.server";

export const Route = createFileRoute("/api/v1/requests/")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request }) => handleApiRoute(request, async ({ request, requestId }) => {
        const principal = await requirePrincipal(request);
        const url = new URL(request.url);
        const filters = requestListSchema.parse(Object.fromEntries(url.searchParams));
        return jsonResponse({ requests: await listRequestsForPrincipal(principal, filters) }, requestId);
      }),
      POST: ({ request }) => handleApiRoute(request, async ({ request, requestId }) => {
        enforceRateLimit(`public-create:${clientIp(request)}`, 5, 60 * 60 * 1000);
        requireTrustedMutationOrigin(request);
        const input = createRequestSchema.parse(await parseJsonBody(request));
        return jsonResponse(await createPublicRequest(input), requestId, 201);
      }),
    },
  },
});
