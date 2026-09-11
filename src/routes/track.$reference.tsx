import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin, SearchX } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { HistoryList, LifecycleTimeline } from "@/components/Timeline";
import { PhotoGrid } from "@/components/PhotoTile";
import { problemLabels } from "@/i18n/fr";
import { formatDate, formatDateTime } from "@/lib/format";
import { useDemoState, useHydrated } from "@/lib/store";

export const Route = createFileRoute("/track/$reference")({
  head: ({ params }) => ({
    meta: [
      { title: `Demande ${params.reference} — Voirie Connect` },
      {
        name: "description",
        content: `Suivi public de la demande de réparation de voirie ${params.reference}.`,
      },
      { property: "og:title", content: `Demande ${params.reference} — Voirie Connect` },
      {
        property: "og:description",
        content: "État d'avancement et historique du signalement de voirie.",
      },
    ],
  }),
  component: TrackDetail,
});

function TrackDetail() {
  const { reference } = Route.useParams();
  const { requests, contractors } = useDemoState();
  const hydrated = useHydrated();
  const request = requests.find((r) => r.reference.toUpperCase() === reference.toUpperCase());

  if (!request) {
    return (
      <PublicLayout>
        <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-semibold">
            {hydrated ? "Aucune demande trouvée" : "Recherche en cours…"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Le numéro <span className="font-medium">{reference}</span> ne correspond à aucun
            signalement enregistré. Vérifiez la saisie.
          </p>
          <Button asChild className="mt-6">
            <Link to="/track">Nouvelle recherche</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const contractor = contractors.find((c) => c.id === request.contractorId);
  const citizenPhotos = request.photos.filter((p) => p.kind === "citizen");
  const workPhotos = request.photos.filter((p) => p.kind !== "citizen");

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link
          to="/track"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à la recherche
        </Link>

        <header className="surface-card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Numéro de suivi</p>
              <h1 className="text-xl font-semibold tracking-wide">{request.reference}</h1>
            </div>
            <StatusBadge status={request.status} size="lg" />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Localisation</dt>
                <dd>
                  {request.address} — quartier {request.district}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Déposée le</dt>
                <dd>{formatDate(request.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </header>

        <section className="surface-card mt-4 p-5">
          <h2 className="text-sm font-semibold">Avancement</h2>
          <div className="mt-4">
            <LifecycleTimeline status={request.status} history={request.history} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Dernière mise à jour : {formatDateTime(request.updatedAt)}
          </p>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">Le signalement</h2>
            <p className="mt-3 text-xs text-muted-foreground">Type de problème</p>
            <p className="text-sm">{problemLabels[request.problemType]}</p>
            <p className="mt-3 text-xs text-muted-foreground">Description</p>
            <p className="text-sm">{request.description}</p>
            {contractor && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">Entreprise en charge</p>
                <p className="text-sm">{contractor.name}</p>
              </>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">Photos</h2>
            <div className="mt-3">
              <PhotoGrid photos={citizenPhotos} empty="Aucune photo transmise." />
            </div>
            {workPhotos.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Travaux réalisés</h3>
                <div className="mt-3">
                  <PhotoGrid photos={workPhotos} />
                </div>
              </>
            )}
          </section>
        </div>

        <section className="surface-card mt-4 p-5">
          <h2 className="text-sm font-semibold">Historique du traitement</h2>
          <div className="mt-4">
            <HistoryList history={request.history} />
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
