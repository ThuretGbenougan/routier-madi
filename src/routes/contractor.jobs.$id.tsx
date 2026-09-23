import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, MapPin, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { ContractorShell } from "@/components/layout/ContractorShell";
import { StatusBadge } from "@/components/StatusBadge";
import { HistoryList, LifecycleTimeline } from "@/components/Timeline";
import { PhotoGrid } from "@/components/PhotoTile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { problemLabels } from "@/i18n/fr";
import { formatDate, formatDateTime } from "@/lib/format";
import { transitionRequest, useDemoState } from "@/lib/store";

export const Route = createFileRoute("/contractor/jobs/$id")({
  head: () => ({
    meta: [
      { title: "Détail de l'intervention — Espace entreprise" },
      {
        name: "description",
        content: "Détail du chantier de voirie : localisation, photos et compte rendu.",
      },
      { property: "og:title", content: "Détail de l'intervention — Espace entreprise" },
      { property: "og:description", content: "Démarrer et clôturer un chantier de voirie." },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { requests, session } = useDemoState();
  const request = requests.find((r) => r.id === id);
  const [comment, setComment] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);

  if (!request) {
    return (
      <ContractorShell title="Intervention introuvable">
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Cette intervention n'existe plus.</p>
          <Button asChild className="mt-4">
            <Link to="/contractor/jobs">Retour aux interventions</Link>
          </Button>
        </div>
      </ContractorShell>
    );
  }

  const actor = session?.name ?? "Équipe terrain";
  const citizenPhotos = request.photos.filter((p) => p.kind === "citizen");
  const workPhotos = request.photos.filter((p) => p.kind !== "citizen");

  return (
    <ContractorShell title={request.reference} description={problemLabels[request.problemType]}>
      <Link
        to="/contractor/jobs"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour aux interventions
      </Link>

      <header className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{request.reference}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {request.address} — quartier {request.district}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Signalé le {formatDate(request.createdAt)}
            </p>
          </div>
          <StatusBadge status={request.status} size="lg" />
        </div>
        <p className="mt-4 border-t border-border pt-4 text-sm">{request.description}</p>
      </header>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">Avancement</h3>
        <div className="mt-4">
          <LifecycleTimeline status={request.status} history={request.history} />
        </div>
      </section>

      {request.status === "ASSIGNED" && (
        <section className="surface-card mt-4 p-5">
          <h3 className="text-sm font-semibold">Démarrer l'intervention</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmez l'arrivée sur site pour passer le chantier en cours.
          </p>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => {
              transitionRequest(request.id, "IN_PROGRESS", {
                actor,
                role: "CONTRACTOR",
                comment: "Démarrage de l'intervention sur site.",
                photoLabels: beforePhoto ? { before: beforePhoto } : undefined,
              });
              setBeforePhoto(null);
              toast.success("Intervention démarrée");
            }}
          >
            <PlayCircle className="size-4" aria-hidden />
            Démarrer l'intervention
          </Button>
          <div className="mt-4">
            <PhotoUpload
              label="Photo avant travaux (facultatif)"
              value={beforePhoto}
              onChange={setBeforePhoto}
              simulateName="avant-travaux.jpg"
            />
          </div>
        </section>
      )}

      {request.status === "IN_PROGRESS" && (
        <section className="surface-card mt-4 space-y-4 p-5">
          <h3 className="text-sm font-semibold">Clôturer les travaux</h3>
          <div className="space-y-1.5">
            <Label htmlFor="comment">Compte rendu des travaux</Label>
            <Textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nature des travaux réalisés, matériaux, durée, remise en circulation…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PhotoUpload
              label="Photo avant travaux"
              value={beforePhoto}
              onChange={setBeforePhoto}
              simulateName="avant-travaux.jpg"
            />
            <PhotoUpload
              label="Photo après travaux"
              value={afterPhoto}
              onChange={setAfterPhoto}
              simulateName="apres-travaux.jpg"
            />
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={comment.trim().length < 5}
            onClick={() => {
              transitionRequest(request.id, "COMPLETED", {
                actor,
                role: "CONTRACTOR",
                comment: comment.trim(),
                photoLabels: {
                  before: beforePhoto ?? undefined,
                  after: afterPhoto ?? undefined,
                },
              });
              setComment("");
              setBeforePhoto(null);
              setAfterPhoto(null);
              toast.success("Travaux déclarés terminés");
            }}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Marquer comme terminé
          </Button>
          <p className="text-xs text-muted-foreground">
            Le service voirie procédera ensuite au contrôle qualité.
          </p>
        </section>
      )}

      {["COMPLETED", "CONTROLLED", "CLOSED"].includes(request.status) && (
        <section className="surface-card mt-4 p-5">
          <h3 className="text-sm font-semibold">Intervention terminée</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucune action supplémentaire n'est attendue de votre part.
          </p>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">Photos du citoyen</h3>
          <div className="mt-3">
            <PhotoGrid photos={citizenPhotos} empty="Aucune photo transmise." />
          </div>
        </section>
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">Photos de chantier</h3>
          <div className="mt-3">
            <PhotoGrid photos={workPhotos} empty="Aucune photo de chantier." />
          </div>
        </section>
      </div>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">Comptes rendus</h3>
        <ul className="mt-3 space-y-3">
          {request.contractorNotes.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucun compte rendu enregistré.</li>
          )}
          {request.contractorNotes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
              <p>{n.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.actor} · {formatDateTime(n.at)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">Historique</h3>
        <div className="mt-4">
          <HistoryList history={request.history} />
        </div>
      </section>
    </ContractorShell>
  );
}

function PhotoUpload({
  label,
  value,
  onChange,
  simulateName,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  simulateName: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="truncate">{value}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Retirer
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <ImagePlus className="size-4" aria-hidden />
            Ajouter
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
                e.target.value = "";
              }}
            />
          </label>
          <Button variant="outline" size="sm" onClick={() => onChange(simulateName)}>
            Simuler
          </Button>
        </div>
      )}
    </div>
  );
}
