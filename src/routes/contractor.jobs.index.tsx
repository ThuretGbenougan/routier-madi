import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import { ContractorShell } from "@/components/layout/ContractorShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/format";
import { useApiState } from "@/lib/api/app-state";

export const Route = createFileRoute("/contractor/jobs/")({
  head: () => ({
    meta: [
      { title: "Mes interventions — Espace entreprise Voirie Connect" },
      {
        name: "description",
        content: "Liste des interventions de voirie attribuées à votre entreprise.",
      },
      { property: "og:title", content: "Mes interventions — Espace entreprise" },
      { property: "og:description", content: "Interventions à démarrer et chantiers en cours." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { requests, session } = useApiState();
  const { t, problemLabel, lang } = useI18n();
  const locationText = (request: { address?: string | undefined }) => request.address ?? t("location.mapOnly");
  const jobs = requests
    .filter(
      (r) =>
        r.contractorId === session?.contractorId &&
        ["ASSIGNED", "IN_PROGRESS"].includes(r.status),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <ContractorShell
      title={t("contractor.jobs.title")}
      description={t("contractor.jobs.description", {
        count: jobs.length,
        plural: jobs.length > 1 ? "s" : "",
      })}
    >
      {jobs.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="text-sm font-medium">{t("contractor.jobs.empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("contractor.jobs.empty.description")}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/contractor/history">{t("contractor.jobs.empty.historyCta")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                to="/contractor/jobs/$id"
                params={{ id: job.id }}
                className="surface-card flex items-center gap-3 p-4 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{job.reference}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    {locationText(job)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("contractor.jobs.reportedOn", {
                      problem: problemLabel(job.problemType),
                      date: formatDate(job.createdAt, lang),
                    })}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ContractorShell>
  );
}
