import { ContractorDetailsSheet } from "@/components/ContractorDetailsSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/layout/AdminShell";
import { UserInvitationDialog } from "@/components/UserInvitationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api/users-api";
import { useI18n } from "@/i18n/LanguageProvider";
import { useApiState } from "@/lib/api/app-state";
export const Route = createFileRoute("/admin/users")({ component: UsersPage });
function UsersPage() {
  const { t } = useI18n();
  const { session } = useApiState();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["users", search, role, page],
    queryFn: () => usersApi.list(search, role, page),
    enabled: session?.role === "ADMIN",
  });
  const data = query.data;
  return (
    <AdminShell
      title={t("users.title")}
      actions={<UserInvitationDialog disabled={!data?.invitationsEnabled} />}
    >
      <div className="space-y-5">
        {data && !data.invitationsEnabled && (
          <p role="status" className="rounded-lg border p-4 text-sm">
            {t("invite.unconfigured")}
          </p>
        )}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-64 flex-1 space-y-2">
            <Label htmlFor="users-search">{t("users.search")}</Label>
            <Input
              id="users-search"
              value={search}
              maxLength={254}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="users-role">{t("users.role")}</Label>
            <select
              id="users-role"
              className="block rounded-md border bg-background p-2 text-sm"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("users.all")}</option>
              <option value="ADMIN">{t("users.ADMIN")}</option>
              <option value="CONTRACTOR">{t("users.CONTRACTOR")}</option>
            </select>
          </div>
        </div>
        {query.isPending ? (
          <p>{t("users.loading")}</p>
        ) : query.isError ? (
          <div role="alert">
            <p>{t("users.loadError")}</p>
            <Button onClick={() => void query.refetch()}>{t("invite.retry")}</Button>
          </div>
        ) : (
          data && (
            <>
              <div className="surface-card relative overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      {(["name", "email", "role", "company", "account", "invitation"] as const).map(
                        (key) => (
                          <th key={key} className="p-3">
                            {t(`users.${key}`)}
                          </th>
                        ),
                      )}
                      <th>
                        <span className="sr-only">{t("invite.resend")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{user.name}</td>
                        <td className="p-3">{user.emailNormalized}</td>
                        <td className="p-3">{t(`users.${user.role}`)}</td>
                        <td className="p-3">{user.contractor?.name ?? "—"}</td>
                        <td className="p-3">
                          <StatusBadge
                            domain="account"
                            status={
                              !user.active
                                ? "DISABLED"
                                : user.accountActivated
                                  ? "ACTIVE"
                                  : "PENDING"
                            }
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col items-start gap-2">
                            <StatusBadge
                              domain="invitation"
                              status={user.invitation?.status ?? "NONE"}
                            />
                            {user.invitation && user.invitation.status !== "CONSUMED" && (
                              <StatusBadge domain="delivery" status={user.invitation.delivery} />
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {user.role === "CONTRACTOR" ? (
                            <ContractorDetailsSheet user={user} />
                          ) : (
                            user.active &&
                            !user.accountActivated && (
                              <UserInvitationDialog
                                user={user}
                                disabled={!data.invitationsEnabled}
                              />
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.users.length && <p className="p-6">{t("users.empty")}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  {t("users.page", {
                    page,
                    pages: Math.max(1, Math.ceil(data.total / 25)),
                    total: data.total,
                  })}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    {t("users.previous")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page * 25 >= data.total}
                    onClick={() => setPage(page + 1)}
                  >
                    {t("users.next")}
                  </Button>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </AdminShell>
  );
}
