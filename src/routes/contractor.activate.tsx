import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/i18n/LanguageProvider";
import { invitationErrorKey } from "@/i18n/invitation-error";
import { contractorsApi } from "@/lib/api/contractors-api";

export const Route = createFileRoute("/contractor/activate")({
  head: () => ({
    meta: [
      { title: "Activation du compte entreprise — Voirie Connect" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ActivateContractor,
});

function ActivateContractor() {
  const { t, setLang } = useI18n();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const value = fragment.get("token") ?? "";
    setToken(/^[A-Za-z0-9_-]{43}$/.test(value) ? value : "");
    const language = fragment.get("lang");
    if (language === "fr" || language === "ru") setLang(language);
    setReady(true);
  }, [setLang]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmation")) {
      setError(t("activate.mismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await contractorsApi.activate(token, password);
      window.history.replaceState(null, "", window.location.pathname);
      setToken("");
      toast.success(t("activate.success"));
      await navigate({ to: "/contractor/login", replace: true });
    } catch (error) {
      setError(t(invitationErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <LanguageSwitch />
        </div>
        <section className="surface-card space-y-4 p-6">
          <h1 className="text-xl font-semibold">{t("activate.title")}</h1>
          {!ready ? (
            <p>{t("invite.loading")}</p>
          ) : !token ? (
            <p role="alert">{t("activate.invalid")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("activate.help")}</p>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("activate.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmation">{t("activate.confirm")}</Label>
                  <Input
                    id="confirmation"
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    disabled={busy}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {t(busy ? "activate.busy" : "activate.submit")}
                </Button>
              </form>
            </>
          )}
          <Link to="/contractor/login" className="inline-block text-sm text-primary underline">
            {t("activate.login")}
          </Link>
        </section>
      </div>
    </main>
  );
}
