import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/i18n/LanguageProvider";
import { establishApiSession, useApiInitialized, useApiState } from "@/lib/api/app-state";
import { authApi } from "@/lib/api/auth-api";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Connexion administration — Voirie Connect" },
      {
        name: "description",
        content: "Accès réservé aux agents du service voirie de la Ville de Valmont.",
      },
      { property: "og:title", content: "Connexion administration — Voirie Connect" },
      { property: "og:description", content: "Espace de gestion des demandes de voirie." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { session } = useApiState();
  const hydrated = useApiInitialized();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && session?.role === "ADMIN") navigate({ to: "/admin/dashboard" });
  }, [hydrated, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await authApi.login({ email, password, role: "ADMIN" });
      await establishApiSession(result);
      setError("");
      toast.success(t("admin.login.welcome", { name: result.name }));
      navigate({ to: "/admin/dashboard" });
    } catch {
      setError(t("admin.login.error"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <LanguageSwitch />
        </div>
        <Link
          to="/"
          className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t("admin.login.back")}
        </Link>
        <div className="surface-card p-6">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-semibold">{t("admin.login.heading")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("app.name")} · {t("app.city")}
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("admin.login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@city.demo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("admin.login.password")}</Label>
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
              {t("admin.login.submit")}
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("admin.login.demoTitle")}</p>
            <p className="mt-1">admin@city.demo · demo123</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setEmail("admin@city.demo");
                setPassword("demo123");
              }}
            >
              {t("admin.login.demoFill")}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("admin.login.contractorPrompt")}{" "}
            <Link to="/contractor/login" className="text-primary hover:underline">
              {t("admin.login.contractorSpace")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
