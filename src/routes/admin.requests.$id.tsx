import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, MapPin, MessageSquarePlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { HistoryList, LifecycleTimeline } from "@/components/Timeline";
import { PhotoGrid } from "@/components/PhotoTile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { problemLabels } from "@/i18n/fr";
import { formatDate, formatDateTime } from "@/lib/format";
import { addNote, assignContractor, transitionRequest, useDemoState } from "@/lib/store";

export const Route = createFileRoute("/admin/requests/$id")({
  head: () => ({
    meta: [
      { title: "Détail d'une demande — Administration Voirie Connect" },
      {
        name: "description",
        content:
          "Traitement complet d'une demande de réparation : vérification, attribution, contrôle et clôture.",
      },
      { property: "og:title", content: "Détail d'une demande — Administration" },
      { property: "og:description", content: "Workflow complet d'une demande de voirie." },
    ],
  }),
  component: RequestDetail,
});

function RequestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { requests, contractors, session } = useDemoState();
  const request = requests.find((r) => r.id === id);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [note, setNote] = useState("");
  const [controlComment, setControlComment] = useState("");

  if (!request) {
    return (
      <AdminShell title="Demande introuvable">
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Cette demande n'existe pas ou a été supprimée lors d'une réinitialisation.
          </p>
          <Button asChild className="mt-4">
            <Link to="/admin/requests">Retour à la liste</Link>
          </Button>
        </div>
      </AdminShell>
    );
  }

  const actor = session?.name ?? "Service voirie";
  const contractor = contractors.find((c) => c.id === request.contractorId);
  const citizenPhotos = request.photos.filter((p) => p.kind === "citizen");
  const workPhotos = request.photos.filter((p) => p.kind !== "citizen");

  function act(fn: () => boolean, message: string) {
    if (fn()) toast.success(message);
    else toast.error("Cette action n'est pas autorisée pour le statut actuel.");
  }

  const nextAction = (() => {
    switch (request.status) {
      case "CREATED":
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                act(
                  () =>
                    transitionRequest(request.id, "VERIFIED", {
                      actor,
                      role: "ADMIN",
                      comment: "Signalement vérifié par le service voirie.",
                    }),
                  "Demande vérifiée",
                )
              }
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Vérifier la demande
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() =>
                act(
                  () =>
                    transitionRequest(request.id, "REJECTED", {
                      actor,
                      role: "ADMIN",
                      comment: "Demande rejetée par le service voirie.",
                    }),
                  "Demande rejetée",
                )
              }
            >
              <XCircle className="size-4" aria-hidden />
              Rejeter
            </Button>
          </div>
        );
      case "VERIFIED":
        return (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="assign">Attribuer à une entreprise</Label>
              <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                <SelectTrigger id="assign" className="w-full">
                  <SelectValue placeholder="Sélectionnez une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!selectedContractor}
              onClick={() =>
                act(
                  () => assignContractor(request.id, selectedContractor, actor),
                  "Entreprise attribuée",
                )
              }
            >
              Attribuer
            </Button>
          </div>
        );
      case "ASSIGNED":
      case "IN_PROGRESS":
        return (
          <p className="text-sm text-muted-foreground">
            Intervention confiée à {contractor?.name ?? "l'entreprise"}. La prochaine action
            relève de l'entreprise.
          </p>
        );
      case "COMPLETED":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="control">Observations du contrôle qualité</Label>
              <Textarea
                id="control"
                rows={3}
                value={controlComment}
                onChange={(e) => setControlComment(e.target.value)}
                placeholder="Conformité des travaux, finitions, signalisation remise en état…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  act(() => {
                    const ok = transitionRequest(request.id, "CONTROLLED", {
                      actor,
                      role: "ADMIN",
                      controlPassed: true,
                      comment: controlComment || "Contrôle qualité : intervention conforme.",
                    });
                    if (ok) setControlComment("");
                    return ok;
                  }, "Contrôle enregistré")
                }
              >
                Valider le contrôle
              </Button>
            </div>
          </div>
        );
      case "CONTROLLED":
        return (
          <Button
            onClick={() =>
              act(
                () =>
                  transitionRequest(request.id, "CLOSED", {
                    actor,
                    role: "ADMIN",
                    comment: "Demande clôturée et citoyen informé.",
                  }),
                "Demande clôturée",
              )
            }
          >
            Clôturer la demande
          </Button>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Aucune action supplémentaire : le dossier est terminé.
          </p>
        );
    }
  })();

  return (
    <AdminShell
      title={request.reference}
      description={`${problemLabels[request.problemType]} · ${request.address}`}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/requests" })}>
          <ArrowLeft className="size-4" aria-hidden />
          Retour
        </Button>
      }
    >
      <header className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{request.reference}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {request.address} — quartier {request.district}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Déposée le {formatDate(request.createdAt)} · dernière mise à jour{" "}
              {formatDateTime(request.updatedAt)}
            </p>
          </div>
          <StatusBadge status={request.status} size="lg" />
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">Prochaine action</h3>
          {nextAction}
        </div>
      </header>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">Cycle de vie</h3>
        <div className="mt-4">
          <LifecycleTimeline status={request.status} history={request.history} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">Informations sur le problème</h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd>{problemLabels[request.problemType]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Description du citoyen</dt>
              <dd>{request.description}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Coordonnées</dt>
              <dd>
                {request.citizenName ?? "Anonyme"}
                {request.citizenEmail ? ` · ${request.citizenEmail}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Localisation approximative</dt>
              <dd>
                {request.lat.toFixed(4)}, {request.lng.toFixed(4)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">Entreprise attribuée</h3>
          {contractor ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Entreprise</dt>
                <dd className="font-medium">{contractor.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Spécialité</dt>
                <dd>{contractor.specialty}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Contact</dt>
                <dd>
                  {contractor.contact} · {contractor.phone}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune entreprise n'est encore attribuée à cette demande.
            </p>
          )}

          <h3 className="mt-5 text-sm font-semibold">Contrôle qualité final</h3>
          {request.controlResult ? (
            <div className="mt-2 rounded-lg border border-success/25 bg-success/5 p-3 text-sm">
              <p className="font-medium text-success">
                {request.controlResult.passed ? "Intervention conforme" : "Non conforme"}
              </p>
              <p className="mt-1 text-muted-foreground">{request.controlResult.comment}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.controlResult.actor} · {formatDateTime(request.controlResult.at)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Contrôle non encore réalisé.</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">Photos du citoyen</h3>
          <div className="mt-3">
            <PhotoGrid photos={citizenPhotos} empty="Aucune photo transmise." />
          </div>
          <h3 className="mt-5 text-sm font-semibold">Photos de chantier</h3>
          <div className="mt-3">
            <PhotoGrid photos={workPhotos} empty="Aucune photo de chantier transmise." />
          </div>
        </section>

        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">Notes internes</h3>
          <ul className="mt-3 space-y-3">
            {request.dispatcherNotes.length === 0 && (
              <li className="text-sm text-muted-foreground">Aucune note interne.</li>
            )}
            {request.dispatcherNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.actor} · {formatDateTime(n.at)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2">
            <Label htmlFor="note">Ajouter une note</Label>
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observation interne, échange téléphonique, contrainte technique…"
            />
            <Button
              size="sm"
              disabled={note.trim().length === 0}
              onClick={() => {
                addNote(request.id, note.trim(), actor, "ADMIN");
                setNote("");
                toast.success("Note ajoutée");
              }}
            >
              <MessageSquarePlus className="size-4" aria-hidden />
              Enregistrer la note
            </Button>
          </div>

          <h3 className="mt-6 text-sm font-semibold">Compte rendu de l'entreprise</h3>
          <ul className="mt-3 space-y-3">
            {request.contractorNotes.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Aucun compte rendu transmis pour le moment.
              </li>
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
      </div>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">Historique du traitement</h3>
        <div className="mt-4">
          <HistoryList history={request.history} />
        </div>
      </section>
    </AdminShell>
  );
}
