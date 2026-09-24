import { createFileRoute } from "@tanstack/react-router";
import { getOptionalPrincipal } from "@/server/auth/session.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse, requireTrustedMutationOrigin } from "@/server/security/request-security.server";
import { uploadPhoto } from "@/server/services/photo-service.server";
import { ValidationError } from "@/server/errors/app-error.server";

export const Route = createFileRoute("/api/v1/requests/$id/photos")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      POST: ({ request, params }) => handleApiRoute(request, async ({ request, requestId }) => {
        requireTrustedMutationOrigin(request);
        const form = await request.formData();
        const image = form.get("image");
        if (!(image instanceof File)) {
          throw new ValidationError([{ path: "image", message: "Fichier image requis.", code: "PHOTO_REQUIRED" }]);
        }
        const photo = await uploadPhoto({
          requestId: params.id,
          file: image,
          kind: typeof form.get("kind") === "string" ? String(form.get("kind")) : null,
          actor: await getOptionalPrincipal(request),
          trackingToken: typeof form.get("trackingToken") === "string" ? String(form.get("trackingToken")) : null,
          correlationId: requestId,
        });
        return jsonResponse({ photo }, requestId, 201);
      }),
    },
  },
});
