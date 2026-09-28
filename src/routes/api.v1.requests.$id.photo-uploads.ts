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
import { reservePhoto } from "@/server/services/photo-upload-service.server";
const schema = z.object({
  kind: z.enum(["citizen", "before", "after"]),
  label: z.string().min(1).max(160),
  idempotencyKey: z.string().uuid(),
  trackingToken: z.string().max(200).optional(),
});
export const Route = createFileRoute("/api/v1/requests/$id/photo-uploads")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) =>
        handleApiRoute(request, async ({ requestId }) => {
          requireTrustedMutationOrigin(request);
          await enforceRateLimit(`photo-reserve:${clientIp(request)}`, 60, 60 * 60_000);
          const input = schema.parse(await parseJsonBody(request));
          return jsonResponse(
            await reservePhoto({
              ...input,
              requestId: params.id,
              actor: await getOptionalPrincipal(request),
            }),
            requestId,
            201,
          );
        }),
    },
  },
});
