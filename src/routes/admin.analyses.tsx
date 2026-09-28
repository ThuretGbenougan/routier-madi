import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/LanguageProvider";
import { useApiState, refreshApiState } from "@/lib/api/app-state";
import { apiRequest } from "@/lib/api/client";
import { photosApi } from "@/lib/api/photos-api";
import type { PhotoAnalysis } from "@/types";
import { toast } from "sonner";
export const Route = createFileRoute("/admin/analyses")({ component: Analyses });
type Data = {
  enabled: boolean;
  publications: number;
  publicationLimit: number;
  analyses: {
    id: string;
    photoId: string;
    status: PhotoAnalysis["status"];
    failureCode: string | null;
    attempts: number;
    photo: { requestId: string; label: string; request: { reference: string } };
  }[];
};
function Analyses() {
  const { session } = useApiState();
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["analyses", session?.userId],
    enabled: session?.role === "ADMIN",
    queryFn: () => apiRequest<Data>("/api/v1/admin/analyses"),
    refetchInterval: 15000,
  });
  return (
    <AdminShell title={t("ml.title")}>
      <p>{query.data?.enabled ? t("ml.enabled") : t("ml.disabled")}</p>
      <p>
        {t("ml.budget", {
          count: query.data?.publications ?? 0,
          limit: query.data?.publicationLimit ?? 180,
        })}
      </p>
      {query.isPending ? (
        <p>{t("admin.dashboard.api.loading")}</p>
      ) : query.isError ? (
        <p>{t("admin.dashboard.api.error")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {query.data.analyses.map((analysis) => (
            <li
              key={analysis.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <Link to="/admin/requests/$id" params={{ id: analysis.photo.requestId }}>
                  {analysis.photo.request.reference}
                </Link>
                <p>
                  {analysis.photo.label} · {t(`ml.${analysis.status}`)}
                </p>
                {analysis.failureCode && <p>{t("ml.failure", { code: analysis.failureCode })}</p>}
              </div>
              {analysis.status === "FAILED" && (
                <Button
                  onClick={async () => {
                    try {
                      await photosApi.retry(analysis.photoId);
                      await refreshApiState();
                    } catch {
                      toast.error(t("ml.retryError"));
                    }
                  }}
                >
                  {t("ml.retry")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {query.data?.analyses.length === 0 && <p>{t("ml.none")}</p>}
    </AdminShell>
  );
}
