import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Clock,
  FileCheck2,
  Inbox,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { statusOrder } from "@/i18n/fr";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate, formatDuration } from "@/lib/format";
import { averageProcessingDays, countByStatus } from "@/lib/stats";
import { useDemoState } from "@/lib/store";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Administration Voirie Connect" },
      {
        name: "description",
        content: "Vue d'ensemble des demandes de réparation de voirie et des délais de traitement.",
      },
      { property: "og:title", content: "Tableau de bord — Administration Voirie Connect" },
      { property: "og:description", content: "Indicateurs de suivi du service voirie." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { requests, contractors } = useDemoState();
  const { t, lang, statusLabel, problemLabel } = useI18n();
  const counts = countByStatus(requests);
  const avg = averageProcessingDays(requests);

  const kpis = [
    { label: t("admin.dashboard.kpi.total"), value: requests.length, icon: ClipboardList },
    { label: t("admin.dashboard.kpi.new"), value: counts.CREATED, icon: Inbox },
    {
      label: t("admin.dashboard.kpi.processing"),
      value: counts.ASSIGNED + counts.IN_PROGRESS,
      icon: Clock,
    },
    { label: t("admin.dashboard.kpi.awaitingControl"), value: counts.COMPLETED, icon: ShieldCheck },
    { label: t("admin.dashboard.kpi.closed"), value: counts.CLOSED, icon: FileCheck2 },
  ];

  const recent = [...requests]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const toProcess = requests
    .filter((r) => ["CREATED", "VERIFIED", "COMPLETED", "CONTROLLED"].includes(r.status))
    .slice(0, 5);

  return (
    <AdminShell
      title={t("admin.dashboard.title")}
      description={t("admin.dashboard.description")}
      actions={
        <Button asChild size="sm">
          <Link to="/admin/requests">{t("admin.dashboard.viewRequests")}</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="surface-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <kpi.icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">{t("admin.dashboard.byStatus")}</h2>
          <ul className="mt-4 space-y-2.5">
            {statusOrder.map((s) => {
              const value = counts[s];
              const pct = requests.length ? (value / requests.length) * 100 : 0;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-muted-foreground">
                    {statusLabel(s)}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-xs font-medium">{value}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">{t("admin.dashboard.avgDuration")}</h2>
          </div>
          <p className="mt-3 text-3xl font-semibold">{formatDuration(avg, lang)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.dashboard.avgDurationNote", { count: counts.CLOSED })}
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">{t("admin.dashboard.contractorsMobilized")}</h3>
            <p className="mt-1 text-2xl font-semibold">{contractors.length}</p>
            <Link
              to="/admin/contractors"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              {t("admin.dashboard.viewContractors")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">{t("admin.dashboard.priorityActions")}</h2>
          {toProcess.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("admin.dashboard.noPending")}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {toProcess.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/admin/requests/$id"
                      params={{ id: r.id }}
                      className="text-sm font-medium hover:underline"
                    >
                      {r.reference}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{r.address}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">{t("admin.dashboard.recentUpdates")}</h2>
          <ul className="mt-3 divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    to="/admin/requests/$id"
                    params={{ id: r.id }}
                    className="text-sm font-medium hover:underline"
                  >
                    {r.reference}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {problemLabel(r.problemType)} · {formatDate(r.updatedAt, lang)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
