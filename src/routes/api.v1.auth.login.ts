import { createFileRoute } from "@tanstack/react-router";
import { login } from "@/server/auth/auth-service.server";
import { isTauriRequest, sessionCookie, toSessionDto } from "@/server/auth/session.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  enforceRateLimit,
  clientIp,
  preflightResponse,
  requireTrustedMutationOrigin,
} from "@/server/security/request-security.server";
import { loginSchema } from "@/server/validation/auth-schemas.server";

export const Route = createFileRoute("/api/v1/auth/login")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          await enforceRateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
          requireTrustedMutationOrigin(request);
          const input = loginSchema.parse(await parseJsonBody(request));
          const result = await login(input, request);
          const headers = new Headers();
          const tauri = isTauriRequest(request);
          if (!tauri) headers.set("set-cookie", sessionCookie(result.token, result.expiresAt));
          return jsonResponse(
            {
              session: toSessionDto(result.principal),
              ...(tauri ? { accessToken: result.token } : {}),
            },
            requestId,
            200,
            headers,
          );
        }),
    },
  },
});
