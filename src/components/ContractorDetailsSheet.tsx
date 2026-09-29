import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ContractorInvitationDialog } from "@/components/ContractorInvitationDialog";
import { contractorsApi } from "@/lib/api/contractors-api";
import type { UserSummary } from "@/lib/api/users-api";
import { useApiState } from "@/lib/api/app-state";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/i18n/LanguageProvider";

export function ContractorDetailsSheet({ user }: { user: UserSummary }) {
  const { t, lang } = useI18n();
  const { session } = useApiState();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["contractors", session?.userId],
    queryFn: contractorsApi.list,
    enabled: open && session?.role === "ADMIN" && Boolean(user.contractor),
    retry: false,
  });
  const contractor = query.data?.contractors.find((item) => item.id === user.contractor?.id);
  const canInvite =
    contractor && ["NONE", "PENDING", "EXPIRED"].includes(contractor.accessStatus ?? "NONE");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal">
          {t("users.manage")}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeLabel={t("invite.close")}
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{t("users.contractorDetails")}</SheetTitle>
          <SheetDescription>{t("users.contractorHelp")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {!user.contractor ? (
            <p role="status">{t("users.contractorMissing")}</p>
          ) : query.isPending ? (
            <p role="status">{t("users.contractorLoading")}</p>
          ) : query.isError ? (
            <div role="alert" className="space-y-3">
              <p>{t("users.contractorError")}</p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                {t("invite.retry")}
              </Button>
            </div>
          ) : !contractor ? (
            <p role="status">{t("users.contractorMissing")}</p>
          ) : (
            <>
              <div>
                <h2 className="break-words text-xl font-semibold">{contractor.name}</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {contractor.specialty}
                </p>
              </div>
              <dl className="space-y-4 border-y py-5 text-sm">
                {(["contact", "phone", "email"] as const).map((field) => (
                  <div key={field}>
                    <dt className="text-muted-foreground">{t(`invite.${field}`)}</dt>
                    <dd className="mt-1 break-words font-medium">{contractor[field] || "—"}</dd>
                  </div>
                ))}
              </dl>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="mb-2 text-muted-foreground">{t("users.account")}</dt>
                  <dd>
                    <StatusBadge
                      domain="account"
                      status={
                        !user.active ? "DISABLED" : user.accountActivated ? "ACTIVE" : "PENDING"
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-muted-foreground">{t("users.invitation")}</dt>
                  <dd>
                    <StatusBadge domain="invitation" status={user.invitation?.status ?? "NONE"} />
                  </dd>
                </div>
                {contractor.invitation && user.invitation?.status !== "CONSUMED" && (
                  <div>
                    <dt className="mb-2 text-muted-foreground">{t("users.delivery")}</dt>
                    <dd className="space-y-2">
                      <StatusBadge domain="delivery" status={contractor.invitation.delivery} />
                      <p className="text-muted-foreground">
                        {t("invite.expiry", {
                          date: formatDateTime(contractor.invitation.expiresAt, lang),
                        })}
                      </p>
                    </dd>
                  </div>
                )}
              </dl>
              {!query.data?.invitationsEnabled && (
                <p role="status" className="rounded-lg border p-3 text-sm">
                  {t("invite.unconfigured")}
                </p>
              )}
              {canInvite && (
                <div className="border-t pt-5">
                  <ContractorInvitationDialog
                    contractor={contractor}
                    disabled={!query.data?.invitationsEnabled || query.isFetching}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
