import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "Suivre une demande — Voirie Connect" },
      {
        name: "description",
        content:
          "Saisissez votre numéro de suivi pour consulter l'état d'avancement de votre signalement de voirie.",
      },
      { property: "og:title", content: "Suivre une demande — Voirie Connect" },
      {
        property: "og:description",
        content: "Consultez l'avancement de votre signalement avec votre numéro de suivi.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const reference = value.trim().toUpperCase();
    if (!/^RR-\d{4}-\d{4}$/.test(reference)) {
      setError(t("track.search.error"));
      return;
    }
    setError("");
    navigate({ to: "/track/$reference", params: { reference } });
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("track.search.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("track.search.subtitle")}</p>

        <form onSubmit={onSubmit} noValidate className="surface-card mt-6 space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="reference">{t("track.search.label")}</Label>
            <Input
              id="reference"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("track.search.placeholder")}
              className="uppercase"
              autoComplete="off"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full">
            <Search className="size-4" aria-hidden />
            {t("track.search.submit")}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">{t("track.search.example")}</p>
      </div>
    </PublicLayout>
  );
}
