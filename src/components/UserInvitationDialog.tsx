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
import { usersApi } from "@/lib/api/users-api";
import type { UserSummary } from "@/lib/api/users-api";
import type { Lang } from "@/i18n";

export function UserInvitationDialog({
  user,
  disabled,
}: {
  user?: UserSummary;
  disabled: boolean;
}) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Lang>(lang);
  const action = user ? "invite.resend" : "users.create";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = user
        ? await usersApi.invite(user.id, language)
        : await usersApi.create({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            language,
          });
      setOpen(false);
      if (result.delivery === "ACCEPTED") toast.success(t("invite.sent"));
      else toast.warning(t("invite.failed"));
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
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        setError("");
        if (next) setLanguage(user?.invitation?.language ?? lang);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="h-auto min-h-9 whitespace-normal"
          disabled={disabled}
          variant={user ? "outline" : "default"}
        >
          {t(action)}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("invite.close")} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? t(action) : t("users.create")}</DialogTitle>
          <DialogDescription>
            {user
              ? `${user.name} · ${user.emailNormalized}. ${t("invite.resendHelp")}`
              : t("users.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!user &&
            (["name", "email"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`user-${field}`}>{t(`users.${field}`)}</Label>
                <Input
                  id={`user-${field}`}
                  name={field}
                  required
                  disabled={busy}
                  type={field === "email" ? "email" : "text"}
                  minLength={1}
                  maxLength={field === "email" ? 254 : 100}
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
            {t(busy ? "invite.busy" : user ? action : "invite.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
