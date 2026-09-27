import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { handleApiRoute, parseJsonBody } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import {
  preflightResponse,
  requireTrustedMutationOrigin,
} from "@/server/security/request-security.server";
import { addNote } from "@/server/services/request-service.server";
import { noteSchema } from "@/server/validation/request-schemas.server";

export const Route = createFileRoute("/api/v1/requests/$id/notes")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          requireTrustedMutationOrigin(request);
          const actor = await requirePrincipal(request);
          const note = noteSchema.parse(await parseJsonBody(request));
          return jsonResponse(
            { request: await addNote({ requestId: params.id, actor, note }) },
            requestId,
          );
        }),
    },
  },
});
