import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/LanguageProvider";
import { invitationErrorKey } from "@/i18n/invitation-error";
import { ApiError } from "@/lib/api/client";
import { contractorsApi } from "@/lib/api/contractors-api";
import { refreshApiState } from "@/lib/api/app-state";
import type { Contractor } from "@/types";
import type { Lang } from "@/i18n";

export function ContractorInvitationDialog({
  contractor,
  disabled,
}: {
  contractor?: Contractor;
  disabled: boolean;
}) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Lang>(lang);
  const action = contractor
    ? contractor.invitation
      ? "invite.resend"
      : "invite.send"
    : "invite.add";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = contractor
        ? await contractorsApi.invite(contractor.id, language)
        : await contractorsApi.create({
            name: String(form.get("name") ?? ""),
            specialty: String(form.get("specialty") ?? ""),
            contact: String(form.get("contact") ?? ""),
            phone: String(form.get("phone") ?? ""),
            email: String(form.get("email") ?? ""),
            language,
          });
      setOpen(false);
      if (result.delivery === "ACCEPTED") {
        toast.success(
          t(
            contractor
              ? contractor.invitation
                ? "invite.resent"
                : "invite.sent"
              : "invite.contractorCreated",
          ),
        );
      } else {
        toast.warning(t(contractor ? "invite.failed" : "invite.contractorCreatedUnconfirmed"));
      }
    } catch (error) {
      setError(
        t(
          error instanceof ApiError && error.code === "RATE_LIMIT_EXCEEDED"
            ? "invite.rate"
            : invitationErrorKey(error),
        ),
      );
    } finally {
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: ["contractors"] });
      void refreshApiState();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        setError("");
        if (next) setLanguage(contractor?.invitation?.language ?? lang);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled} variant={contractor ? "outline" : "default"}>
          {t(action)}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("invite.close")} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contractor ? t(action) : t("invite.title")}</DialogTitle>
          <DialogDescription>
            {contractor
              ? `${contractor.name} · ${contractor.email}. ${t("invite.resendHelp")}`
              : t("invite.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!contractor &&
            (["name", "specialty", "contact", "phone", "email"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`contractor-${field}`}>{t(`invite.${field}`)}</Label>
                <Input
                  id={`contractor-${field}`}
                  name={field}
                  required
                  disabled={busy}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  minLength={field === "phone" ? 3 : 1}
                  maxLength={
                    field === "email"
                      ? 254
                      : field === "phone"
                        ? 40
                        : field === "contact"
                          ? 100
                          : 150
                  }
                />
              </div>
            ))}
          <div className="space-y-1.5">
            <Label htmlFor="invitation-language">{t("invite.language")}</Label>
            <select
              id="invitation-language"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={language}
              disabled={busy}
              onChange={(event) => setLanguage(event.target.value === "ru" ? "ru" : "fr")}
            >
              <option value="fr">{t("invite.fr")}</option>
              <option value="ru">{t("invite.ru")}</option>
            </select>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {t(busy ? "invite.busy" : contractor ? action : "invite.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
