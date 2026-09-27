import { createFileRoute, Link } from "@tanstack/react-router";
import { ContractorShell } from "@/components/layout/ContractorShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/format";
import { useApiState } from "@/lib/api/app-state";

export const Route = createFileRoute("/contractor/history")({
  head: () => ({
    meta: [
      { title: "Historique des interventions — Espace entreprise" },
      {
        name: "description",
        content: "Interventions de voirie terminées, contrôlées et clôturées par votre entreprise.",
      },
      { property: "og:title", content: "Historique des interventions — Espace entreprise" },
      { property: "og:description", content: "Chantiers terminés et clôturés." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { requests, session } = useApiState();
  const { t, problemLabel, lang } = useI18n();
  const locationText = (request: { address?: string | undefined }) => request.address ?? t("location.mapOnly");
  const done = requests
    .filter(
      (r) =>
        r.contractorId === session?.contractorId &&
        ["COMPLETED", "CONTROLLED", "CLOSED"].includes(r.status),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <ContractorShell
      title={t("contractor.history.title")}
      description={t("contractor.history.description", {
        count: done.length,
        plural: done.length > 1 ? "s" : "",
      })}
    >
      {done.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          {t("contractor.history.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {done.map((r) => (
            <li key={r.id}>
              <Link
                to="/contractor/jobs/$id"
                params={{ id: r.id }}
                className="surface-card block p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{r.reference}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{locationText(r)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("contractor.history.completedOn", {
                    problem: problemLabel(r.problemType),
                    date: formatDate(r.updatedAt, lang),
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ContractorShell>
  );
}
