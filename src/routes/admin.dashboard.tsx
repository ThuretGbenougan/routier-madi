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
import { statusLabels, statusOrder, problemLabels } from "@/i18n/fr";
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
  const counts = countByStatus(requests);
  const avg = averageProcessingDays(requests);

  const kpis = [
    { label: "Total des demandes", value: requests.length, icon: ClipboardList },
    { label: "Nouvelles à vérifier", value: counts.CREATED, icon: Inbox },
    {
      label: "En cours de traitement",
      value: counts.ASSIGNED + counts.IN_PROGRESS,
      icon: Clock,
    },
    { label: "En attente de contrôle", value: counts.COMPLETED, icon: ShieldCheck },
    { label: "Demandes clôturées", value: counts.CLOSED, icon: FileCheck2 },
  ];

  const recent = [...requests]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const toProcess = requests
    .filter((r) => ["CREATED", "VERIFIED", "COMPLETED", "CONTROLLED"].includes(r.status))
    .slice(0, 5);

  return (
    <AdminShell
      title="Tableau de bord"
      description="Suivi global des demandes de réparation de voirie"
      actions={
        <Button asChild size="sm">
          <Link to="/admin/requests">Voir les demandes</Link>
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
          <h2 className="text-sm font-semibold">Répartition par statut</h2>
          <ul className="mt-4 space-y-2.5">
            {statusOrder.map((s) => {
              const value = counts[s];
              const pct = requests.length ? (value / requests.length) * 100 : 0;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-muted-foreground">
                    {statusLabels[s]}
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
            <h2 className="text-sm font-semibold">Délai moyen de traitement</h2>
          </div>
          <p className="mt-3 text-3xl font-semibold">{formatDuration(avg)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Calculé sur les {counts.CLOSED} demandes clôturées.
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Entreprises mobilisées</h3>
            <p className="mt-1 text-2xl font-semibold">{contractors.length}</p>
            <Link
              to="/admin/contractors"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Consulter les entreprises
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">Actions prioritaires</h2>
          {toProcess.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune demande n'attend une action du service.
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
          <h2 className="text-sm font-semibold">Dernières mises à jour</h2>
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
                    {problemLabels[r.problemType]} · {formatDate(r.updatedAt)}
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
