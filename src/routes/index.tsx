import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardCheck, MapPin, Search, Send } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/lib/store";
import { daysBetween, formatDuration } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signaler un problème de voirie — Ville de Valmont" },
      {
        name: "description",
        content:
          "Signalez un nid-de-poule, un trottoir dégradé ou un problème d'écoulement en quelques minutes et suivez l'avancement des travaux.",
      },
      { property: "og:title", content: "Signaler un problème de voirie — Ville de Valmont" },
      {
        property: "og:description",
        content: "Déposez votre signalement et suivez son traitement avec votre numéro de suivi.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: Send,
    title: "Vous signalez",
    text: "Décrivez le problème, indiquez l'adresse et ajoutez une ou plusieurs photos.",
  },
  {
    icon: ClipboardCheck,
    title: "La ville vérifie et attribue",
    text: "Le service voirie contrôle le signalement puis confie les travaux à une entreprise.",
  },
  {
    icon: CheckCircle2,
    title: "Vous suivez jusqu'à la clôture",
    text: "Chaque étape est visible avec votre numéro de suivi, jusqu'au contrôle final.",
  },
];

function Index() {
  const { requests } = useDemoState();
  const closed = requests.filter((r) => r.status === "CLOSED");
  const inProgress = requests.filter((r) =>
    ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(r.status),
  );
  const avg =
    closed.length > 0
      ? closed.reduce((sum, r) => sum + daysBetween(r.createdAt, r.closedAt ?? r.updatedAt), 0) /
        closed.length
      : 0;

  const stats = [
    { value: String(requests.length), label: "Signalements reçus" },
    { value: String(inProgress.length), label: "Interventions en cours" },
    { value: String(closed.length), label: "Réparations clôturées" },
    { value: formatDuration(avg), label: "Délai moyen de traitement" },
  ];

  return (
    <PublicLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            Service voirie de la Ville de Valmont
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Signalez un problème de voirie en quelques minutes
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Nid-de-poule, trottoir dégradé, eau stagnante ou marquage effacé : votre signalement
            est traité et suivi jusqu'à la réparation.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 text-base">
              <Link to="/report">
                Signaler un problème
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 text-base">
              <Link to="/track">
                <Search className="size-4" aria-hidden />
                Suivre une demande
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Aucune création de compte nécessaire pour signaler un problème.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-xl font-semibold">Comment ça marche</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="surface-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Étape {i + 1}</span>
              </div>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <h2 className="text-xl font-semibold">La voirie en chiffres</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-4">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Besoin d'aide pour votre signalement ?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              L'accueil voirie vous accompagne au 01 45 00 12 12 ou par courriel à
              voirie@valmont.fr.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/track">Suivre une demande</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
