import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { statusOrder } from "@/i18n/fr";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDuration } from "@/lib/format";
import { averageProcessingDays, byContractor, countByStatus, createdOverTime } from "@/lib/stats";
import { useApiState } from "@/lib/api/app-state";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Rapports d'activité — Administration Voirie Connect" },
      {
        name: "description",
        content:
          "Statistiques de l'activité voirie : répartition par statut, charge par entreprise et délais.",
      },
      { property: "og:title", content: "Rapports d'activité — Administration" },
      { property: "og:description", content: "Indicateurs et graphiques de l'activité voirie." },
    ],
  }),
  component: ReportsPage,
});

const palette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function ReportsPage() {
  const { requests, contractors } = useApiState();
  const { t, lang, statusLabel } = useI18n();
  const counts = countByStatus(requests);
  const statusData = statusOrder.map((s) => ({ name: statusLabel(s), value: counts[s] }));
  const contractorData = byContractor(requests, contractors).map((r) => ({
    name: r.contractor.name,
    total: r.total,
    done: r.done,
  }));
  const timeData = createdOverTime(requests);
  const avg = averageProcessingDays(requests);
  const completed = counts.COMPLETED + counts.CONTROLLED + counts.CLOSED;

  return (
    <AdminShell
      title={t("admin.reports.title")}
      description={t("admin.reports.description")}
      actions={
        <Button
          size="sm"
          onClick={() =>
            toast.success(t("admin.reports.exportToast"), {
              description: t("admin.reports.exportDescription"),
            })
          }
        >
          <Download className="size-4" aria-hidden />
          {t("admin.reports.export")}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">{t("admin.reports.processed")}</p>
          <p className="mt-1 text-2xl font-semibold">{completed}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">{t("admin.reports.avgDuration")}</p>
          <p className="mt-1 text-2xl font-semibold">{formatDuration(avg, lang)}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">{t("admin.reports.closureRate")}</p>
          <p className="mt-1 text-2xl font-semibold">
            {requests.length ? Math.round((counts.CLOSED / requests.length) * 100) : 0} %
          </p>
        </div>
      </div>

      <section className="surface-card mt-4 p-5">
        <h2 className="text-sm font-semibold">{t("admin.reports.byStatus")}</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" name={t("admin.reports.seriesRequests")} radius={[4, 4, 0, 0]}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">{t("admin.reports.byContractor")}</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contractorData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="total"
                  name={t("admin.reports.seriesAssigned")}
                  fill="var(--color-chart-1)"
                  radius={4}
                />
                <Bar
                  dataKey="done"
                  name={t("admin.reports.seriesDone")}
                  fill="var(--color-chart-2)"
                  radius={4}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">{t("admin.reports.overTime")}</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData} margin={{ left: -20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={t("admin.reports.seriesReports")}
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
