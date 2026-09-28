import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getOptionalPrincipal } from "@/server/auth/session.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  clientIp,
  enforceRateLimit,
  preflightResponse,
  requireTrustedMutationOrigin,
} from "@/server/security/request-security.server";
import { completePhoto } from "@/server/services/photo-upload-service.server";
export const Route = createFileRoute("/api/v1/requests/$id/photo-uploads/$uploadId/complete")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) =>
        handleApiRoute(request, async ({ requestId }) => {
          requireTrustedMutationOrigin(request);
          await enforceRateLimit(`photo-complete:${clientIp(request)}`, 120, 60 * 60_000);
          const input = z
            .object({ trackingToken: z.string().max(200).optional() })
            .parse(await parseJsonBody(request));
          return jsonResponse(
            {
              photo: await completePhoto({
                ...input,
                requestId: params.id,
                uploadId: params.uploadId,
                actor: await getOptionalPrincipal(request),
              }),
            },
            requestId,
            201,
          );
        }),
    },
  },
});
