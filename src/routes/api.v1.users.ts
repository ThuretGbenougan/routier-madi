import { createAdmin } from "@/server/services/user-service.server";
import { userSchema, usersQuerySchema } from "@/server/validation/user-schemas.server";
import { listUsers } from "@/server/services/user-service.server";
import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireAdmin } from "@/server/authorization/guards.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  preflightResponse,
  requireTrustedMutationOrigin,
  enforceRateLimit,
} from "@/server/security/request-security.server";

export const Route = createFileRoute("/api/v1/users")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          const actor = await requirePrincipal(request);
          requireAdmin(actor);
          requireTrustedMutationOrigin(request);
          await enforceRateLimit(`user-create:${actor.userId}`, 20, 60 * 60_000);
          const result = await createAdmin(userSchema.parse(await parseJsonBody(request)), actor);
          return jsonResponse(result, requestId, 201);
        }),
      GET: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          const actor = await requirePrincipal(request);
          requireAdmin(actor);
          const input = usersQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return jsonResponse(await listUsers(input, actor), requestId);
        }),
    },
  },
});
