import { StatusBadge } from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { ContractorInvitationDialog } from "@/components/ContractorInvitationDialog";
import { contractorsApi } from "@/lib/api/contractors-api";
import { formatDateTime } from "@/lib/format";
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
  const { requests, session } = useApiState();
  const query = useQuery({
    queryKey: ["contractors", session?.userId],
    queryFn: contractorsApi.list,
    enabled: session?.role === "ADMIN",
    refetchInterval: 30_000,
  });
  const contractors = query.data?.contractors ?? [];
  const enabled = query.data?.invitationsEnabled === true && !query.isError;
  const { t, lang } = useI18n();
  const rows = byContractor(requests, contractors);

  return (
    <AdminShell
      title={t("admin.contractors.title")}
      description={t("admin.contractors.description")}
      actions={<ContractorInvitationDialog disabled={!enabled} />}
    >
      {query.isPending && <p role="status">{t("invite.loading")}</p>}
      {query.isError && (
        <div role="alert" className="mb-4">
          <p>{t("invite.loadError")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("invite.retry")}
          </Button>
        </div>
      )}
      {query.data && !query.data.invitationsEnabled && (
        <p className="mb-4 rounded-lg border border-border p-4 text-sm" role="status">
          {t("invite.unconfigured")}
        </p>
      )}
      {query.isSuccess && !rows.length && <p>{t("invite.empty")}</p>}
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

            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <StatusBadge domain="access" status={contractor.accessStatus ?? "NONE"} />
              {contractor.invitation && contractor.accessStatus !== "ACTIVE" && (
                <>
                  <div>
                    <StatusBadge domain="delivery" status={contractor.invitation.delivery} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("invite.expiry", {
                      date: formatDateTime(contractor.invitation.expiresAt, lang),
                    })}
                  </p>
                </>
              )}
              {!["ACTIVE", "DISABLED"].includes(contractor.accessStatus ?? "NONE") && (
                <ContractorInvitationDialog contractor={contractor} disabled={!enabled} />
              )}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/admin/requests">{t("admin.contractors.viewRequests")}</Link>
            </Button>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
