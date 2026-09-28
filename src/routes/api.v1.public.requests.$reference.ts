import { createFileRoute } from "@tanstack/react-router";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  clientIp,
  enforceRateLimit,
  preflightResponse,
} from "@/server/security/request-security.server";
import { getPublicRequest } from "@/server/services/request-service.server";
import { ValidationError } from "@/server/errors/app-error.server";

export const Route = createFileRoute("/api/v1/public/requests/$reference")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request, params }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          await enforceRateLimit(`public-track:${clientIp(request)}`, 30, 15 * 60 * 1000);
          const token = new URL(request.url).searchParams.get("trackingToken");
          if (!token)
            throw new ValidationError([
              {
                path: "trackingToken",
                message: "Jeton de suivi requis.",
                code: "TRACKING_TOKEN_REQUIRED",
              },
            ]);
          return jsonResponse(
            { request: await getPublicRequest(params.reference, token) },
            requestId,
          );
        }),
    },
  },
});
