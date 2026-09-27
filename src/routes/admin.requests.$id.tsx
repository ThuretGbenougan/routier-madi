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
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate, formatDateTime } from "@/lib/format";
import { refreshApiState, useApiState } from "@/lib/api/app-state";
import { requestsApi } from "@/lib/api/requests-api";

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
  const { requests, contractors, session } = useApiState();
  const { t, lang, problemLabel, text } = useI18n();
  const request = requests.find((r) => r.id === id);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [note, setNote] = useState("");
  const [controlComment, setControlComment] = useState("");

  if (!request) {
    return (
      <AdminShell title={t("admin.detail.notFoundTitle")}>
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("admin.detail.notFoundBody")}
          </p>
          <Button asChild className="mt-4">
            <Link to="/admin/requests">{t("admin.detail.backToList")}</Link>
          </Button>
        </div>
      </AdminShell>
    );
  }

  const contractor = contractors.find((c) => c.id === request.contractorId);
  const citizenPhotos = request.photos.filter((p) => p.kind === "citizen");
  const workPhotos = request.photos.filter((p) => p.kind !== "citizen");

  function act(fn: () => Promise<unknown>, message: string) {
    void fn()
      .then(() => toast.success(message))
      .catch(() => toast.error(t("admin.detail.actionForbidden")));
  }

  async function transition(to: import("@/types").RequestStatus, options: { comment?: string; controlPassed?: boolean }) {
    await requestsApi.transition(request!.id, { to, ...options });
    await refreshApiState(session ?? undefined);
  }

  async function assign(contractorId: string) {
    await requestsApi.assign(request!.id, { contractorId });
    await refreshApiState(session ?? undefined);
  }

  async function addInternalNote(body: string) {
    await requestsApi.addNote(request!.id, body);
    await refreshApiState(session ?? undefined);
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
                    transition("VERIFIED", {
                      comment: t("admin.detail.historyVerified"),
                    }),
                  t("admin.detail.toastVerified"),
                )
              }
            >
              <CheckCircle2 className="size-4" aria-hidden />
              {t("admin.detail.verify")}
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() =>
                act(
                  () =>
                    transition("REJECTED", {
                      comment: t("admin.detail.historyRejected"),
                    }),
                  t("admin.detail.toastRejected"),
                )
              }
            >
              <XCircle className="size-4" aria-hidden />
              {t("admin.detail.reject")}
            </Button>
          </div>
        );
      case "VERIFIED":
        return (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="assign">{t("admin.detail.assignTo")}</Label>
              <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                <SelectTrigger id="assign" className="w-full">
                  <SelectValue placeholder={t("admin.detail.assignPlaceholder")} />
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
                  () => assign(selectedContractor),
                  t("admin.detail.toastAssigned"),
                )
              }
            >
              {t("admin.detail.assign")}
            </Button>
          </div>
        );
      case "ASSIGNED":
      case "IN_PROGRESS":
        return (
          <p className="text-sm text-muted-foreground">
            {t("admin.detail.inProgressNote", {
              contractor: contractor?.name ?? t("admin.detail.contractorFallback"),
            })}
          </p>
        );
      case "COMPLETED":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="control">{t("admin.detail.controlObservations")}</Label>
              <Textarea
                id="control"
                rows={3}
                value={controlComment}
                onChange={(e) => setControlComment(e.target.value)}
                placeholder={t("admin.detail.controlPlaceholder")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  act(async () => {
                    await transition("CONTROLLED", {
                      controlPassed: true,
                      comment: controlComment || t("admin.detail.historyControlPassed"),
                    });
                    setControlComment("");
                  }, t("admin.detail.toastControl"))
                }
              >
                {t("admin.detail.validateControl")}
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
                  transition("CLOSED", {
                    comment: t("admin.detail.historyClosed"),
                  }),
                t("admin.detail.toastClosed"),
              )
            }
          >
            {t("admin.detail.close")}
          </Button>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            {t("admin.detail.noMoreActions")}
          </p>
        );
    }
  })();

  return (
    <AdminShell
      title={request.reference}
      description={`${problemLabel(request.problemType)} · ${request.address}`}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/requests" })}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("admin.detail.back")}
        </Button>
      }
    >
      <header className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{request.reference}</h2>
            {!request.address && <p className="text-sm text-muted-foreground">{t("location.mapOnly")}</p>}
            {request.address && <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {request.address} — {t("admin.detail.districtLabel", { district: request.district ?? t("location.mapOnly") })}
            </p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.detail.deposited", {
                date: formatDate(request.createdAt, lang),
                datetime: formatDateTime(request.updatedAt, lang),
              })}
            </p>
          </div>
          <StatusBadge status={request.status} size="lg" />
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">{t("admin.detail.nextAction")}</h3>
          {nextAction}
        </div>
      </header>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">{t("admin.detail.lifecycle")}</h3>
        <div className="mt-4">
          <LifecycleTimeline status={request.status} history={request.history} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">{t("admin.detail.problemInfo")}</h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.detail.type")}</dt>
              <dd>{problemLabel(request.problemType)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.detail.citizenDescription")}</dt>
              <dd>{request.description}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.detail.contactInfo")}</dt>
              <dd>
                {request.citizenName ?? t("admin.detail.anonymous")}
                {request.citizenEmail ? ` · ${request.citizenEmail}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.detail.approximateLocation")}</dt>
              <dd>
                {request.lat.toFixed(4)}, {request.lng.toFixed(4)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">{t("admin.detail.assignedContractor")}</h3>
          {contractor ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t("admin.detail.contractorLabel")}</dt>
                <dd className="font-medium">{contractor.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("admin.detail.specialty")}</dt>
                <dd>{contractor.specialty}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("admin.detail.contact")}</dt>
                <dd>
                  {contractor.contact} · {contractor.phone}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("admin.detail.noContractorYet")}
            </p>
          )}

          <h3 className="mt-5 text-sm font-semibold">{t("admin.detail.finalControl")}</h3>
          {request.controlResult ? (
            <div className="mt-2 rounded-lg border border-success/25 bg-success/5 p-3 text-sm">
              <p className="font-medium text-success">
                {request.controlResult.passed
                  ? t("admin.detail.controlPassed")
                  : t("admin.detail.controlFailed")}
              </p>
              <p className="mt-1 text-muted-foreground">{text(request.controlResult.comment)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.controlResult.actor} · {formatDateTime(request.controlResult.at, lang)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("admin.detail.controlNotDone")}</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">{t("admin.detail.citizenPhotos")}</h3>
          <div className="mt-3">
            <PhotoGrid photos={citizenPhotos} empty={t("photo.none")} />
          </div>
          <h3 className="mt-5 text-sm font-semibold">{t("admin.detail.sitePhotos")}</h3>
          <div className="mt-3">
            <PhotoGrid photos={workPhotos} empty={t("admin.detail.noSitePhotos")} />
          </div>
        </section>

        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">{t("admin.detail.internalNotes")}</h3>
          <ul className="mt-3 space-y-3">
            {request.dispatcherNotes.length === 0 && (
              <li className="text-sm text-muted-foreground">{t("admin.detail.noInternalNotes")}</li>
            )}
            {request.dispatcherNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.actor} · {formatDateTime(n.at, lang)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2">
            <Label htmlFor="note">{t("admin.detail.addNote")}</Label>
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("admin.detail.notePlaceholder")}
            />
            <Button
              size="sm"
              disabled={note.trim().length === 0}
              onClick={() => {
                void addInternalNote(note.trim())
                  .then(() => {
                    setNote("");
                    toast.success(t("admin.detail.toastNoteAdded"));
                  })
                  .catch(() => toast.error(t("admin.detail.actionForbidden")));
              }}
            >
              <MessageSquarePlus className="size-4" aria-hidden />
              {t("admin.detail.saveNote")}
            </Button>
          </div>

          <h3 className="mt-6 text-sm font-semibold">{t("admin.detail.contractorReport")}</h3>
          <ul className="mt-3 space-y-3">
            {request.contractorNotes.length === 0 && (
              <li className="text-sm text-muted-foreground">
                {t("admin.detail.noContractorReport")}
              </li>
            )}
            {request.contractorNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.actor} · {formatDateTime(n.at, lang)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">{t("admin.detail.processingHistory")}</h3>
        <div className="mt-4">
          <HistoryList history={request.history} />
        </div>
      </section>
    </AdminShell>
  );
}
