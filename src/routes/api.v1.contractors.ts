import { createFileRoute } from "@tanstack/react-router";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireAdmin } from "@/server/authorization/guards.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { toContractorDto } from "@/server/mappers/repair-request-mappers.server";
import { listContractors } from "@/server/repositories/request-repository.server";
import { db } from "@/server/db.server";
import { preflightResponse } from "@/server/security/request-security.server";

export const Route = createFileRoute("/api/v1/contractors")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request }) =>
        handleApiRoute(request, async ({ request, requestId }) => {
          requireAdmin(await requirePrincipal(request));
          return jsonResponse(
            { contractors: (await listContractors(db)).map(toContractorDto) },
            requestId,
          );
        }),
    },
  },
});
