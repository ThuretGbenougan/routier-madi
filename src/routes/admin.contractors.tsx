import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, User } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/LanguageProvider";
import { byContractor } from "@/lib/stats";
import { useApiState } from "@/lib/api/app-state";

export const Route = createFileRoute("/admin/contractors")({
  head: () => ({
    meta: [
      { title: "Entreprises partenaires — Administration Voirie Connect" },
      {
        name: "description",
        content: "Entreprises de travaux publics mobilisées et charge d'interventions en cours.",
      },
      { property: "og:title", content: "Entreprises partenaires — Administration" },
      { property: "og:description", content: "Suivi de la charge des entreprises partenaires." },
    ],
  }),
  component: ContractorsPage,
});

function ContractorsPage() {
  const { requests, contractors } = useApiState();
  const { t } = useI18n();
  const rows = byContractor(requests, contractors);

  return (
    <AdminShell
      title={t("admin.contractors.title")}
      description={t("admin.contractors.description")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ contractor, total, active, done }) => (
          <article key={contractor.id} className="surface-card p-5">
            <h2 className="text-base font-semibold">{contractor.name}</h2>
            <p className="text-sm text-muted-foreground">{contractor.specialty}</p>

            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <dt className="text-xs text-muted-foreground">{t("admin.contractors.total")}</dt>
                <dd className="text-lg font-semibold">{total}</dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <dt className="text-xs text-muted-foreground">{t("admin.contractors.active")}</dt>
                <dd className="text-lg font-semibold">{active}</dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <dt className="text-xs text-muted-foreground">{t("admin.contractors.done")}</dt>
                <dd className="text-lg font-semibold">{done}</dd>
              </div>
            </dl>

            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <User className="size-4" aria-hidden />
                {contractor.contact}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4" aria-hidden />
                {contractor.phone}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4" aria-hidden />
                {contractor.email}
              </li>
            </ul>

            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/admin/requests">{t("admin.contractors.viewRequests")}</Link>
            </Button>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
