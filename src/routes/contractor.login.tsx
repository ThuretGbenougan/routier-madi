import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/LanguageProvider";
import { login, useDemoState, useHydrated } from "@/lib/store";

export const Route = createFileRoute("/contractor/login")({
  head: () => ({
    meta: [
      { title: "Connexion entreprise — Voirie Connect" },
      {
        name: "description",
        content: "Accès réservé aux entreprises partenaires chargées des travaux de voirie.",
      },
      { property: "og:title", content: "Connexion entreprise — Voirie Connect" },
      { property: "og:description", content: "Suivi des interventions attribuées aux entreprises." },
    ],
  }),
  component: ContractorLogin,
});

function ContractorLogin() {
  const navigate = useNavigate();
  const { session } = useDemoState();
  const hydrated = useHydrated();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && session?.role === "CONTRACTOR") navigate({ to: "/contractor/jobs" });
  }, [hydrated, session, navigate]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(email, password, "CONTRACTOR");
    if (!result) {
      setError(t("contractor.login.error"));
      return;
    }
    setError("");
    toast.success(t("contractor.login.welcome", { name: result.name }));
    navigate({ to: "/contractor/jobs" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t("contractor.login.back")}
        </Link>
        <div className="surface-card p-6">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-semibold">{t("contractor.login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("app.name")} · {t("app.city")}
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("contractor.login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contractor@city.demo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("contractor.login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              {t("contractor.login.submit")}
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("contractor.login.demoTitle")}</p>
            <p className="mt-1">{t("contractor.login.demoCreds")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setEmail("contractor@city.demo");
                setPassword("demo123");
              }}
            >
              {t("contractor.login.demoFill")}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("contractor.login.adminPrompt")}{" "}
            <Link to="/admin/login" className="text-primary hover:underline">
              {t("contractor.login.adminLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
