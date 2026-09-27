import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/server/db.server";
import { requirePrincipal } from "@/server/auth/session.server";
import { requireAdmin } from "@/server/authorization/guards.server";
import { handleApiRoute } from "@/server/http/api-handler.server";
import { jsonResponse } from "@/server/http/api-response.server";
import { preflightResponse } from "@/server/security/request-security.server";
import { getServerEnv } from "@/server/env.server";
export const Route = createFileRoute("/api/v1/admin/analyses")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflightResponse(request),
      GET: ({ request }) =>
        handleApiRoute(request, async ({ requestId }) => {
          requireAdmin(await requirePrincipal(request));
          const start = Math.floor(Date.now() / 86400000) * 86400000;
          const key = `${createHash("sha256").update("ml-publications").digest("hex")}:${start}`;
          const [analyses, budget] = await Promise.all([
            db.mlAnalysis.findMany({
              where: { status: { in: ["PENDING", "PROCESSING", "FAILED"] } },
              orderBy: { updatedAt: "asc" },
              take: 100,
              select: {
                id: true,
                status: true,
                attempts: true,
                failureCode: true,
                updatedAt: true,
                photoId: true,
                photo: {
                  select: {
                    requestId: true,
                    label: true,
                    request: { select: { reference: true } },
                  },
                },
              },
            }),
            db.rateBucket.findUnique({ where: { key } }),
          ]);
          return jsonResponse(
            {
              analyses,
              enabled: getServerEnv().ML_ENABLED === "true",
              publications: Math.min(budget?.count ?? 0, 180),
              publicationLimit: 180,
            },
            requestId,
          );
        }),
    },
  },
});
