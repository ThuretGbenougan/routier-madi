import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const reference = value.trim().toUpperCase();
    if (!/^RR-\d{4}-\d{4}$/.test(reference)) {
      setError("Le numéro de suivi doit être au format RR-2026-0001.");
      return;
    }
    setError("");
    navigate({ to: "/track/$reference", params: { reference } });
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Suivre une demande</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisissez le numéro de suivi communiqué lors du dépôt de votre signalement.
        </p>

        <form onSubmit={onSubmit} noValidate className="surface-card mt-6 space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="reference">Numéro de suivi</Label>
            <Input
              id="reference"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="RR-2026-0001"
              className="uppercase"
              autoComplete="off"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full">
            <Search className="size-4" aria-hidden />
            Rechercher
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Exemple de démonstration : RR-2026-0010 (intervention en cours) ou RR-2026-0001
          (demande clôturée).
        </p>
      </div>
    </PublicLayout>
  );
}
