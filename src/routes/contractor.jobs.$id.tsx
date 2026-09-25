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
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate, formatDateTime } from "@/lib/format";
import { refreshApiState, useApiState } from "@/lib/api/app-state";
import { photosApi } from "@/lib/api/photos-api";
import { requestsApi } from "@/lib/api/requests-api";

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
  const { requests, session } = useApiState();
  const { t, problemLabel, lang } = useI18n();
  const request = requests.find((r) => r.id === id);
  const [comment, setComment] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);

  if (!request) {
    return (
      <ContractorShell title={t("contractor.job.notFoundTitle")}>
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("contractor.job.notFoundDescription")}</p>
          <Button asChild className="mt-4">
            <Link to="/contractor/jobs">{t("contractor.job.backToJobs")}</Link>
          </Button>
        </div>
      </ContractorShell>
    );
  }

  const citizenPhotos = request.photos.filter((p) => p.kind === "citizen");
  const workPhotos = request.photos.filter((p) => p.kind !== "citizen");

  return (
    <ContractorShell title={request.reference} description={problemLabel(request.problemType)}>
      <Link
        to="/contractor/jobs"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("contractor.job.back")}
      </Link>

      <header className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{request.reference}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {request.address} — {t("contractor.job.district", { district: request.district })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("contractor.job.reportedOn", { date: formatDate(request.createdAt, lang) })}
            </p>
          </div>
          <StatusBadge status={request.status} size="lg" />
        </div>
        <p className="mt-4 border-t border-border pt-4 text-sm">{request.description}</p>
      </header>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">{t("contractor.job.progressTitle")}</h3>
        <div className="mt-4">
          <LifecycleTimeline status={request.status} history={request.history} />
        </div>
      </section>

      {request.status === "ASSIGNED" && (
        <section className="surface-card mt-4 p-5">
          <h3 className="text-sm font-semibold">{t("contractor.job.startTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("contractor.job.startDescription")}
          </p>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => {
              void (async () => {
                if (beforePhoto) await photosApi.upload(request.id, beforePhoto, "before");
                await requestsApi.transition(request.id, { to: "IN_PROGRESS", comment: t("contractor.job.startComment") });
                await refreshApiState(session ?? undefined);
                setBeforePhoto(null);
                toast.success(t("contractor.job.startedToast"));
              })().catch(() => toast.error("Action impossible."));
            }}
          >
            <PlayCircle className="size-4" aria-hidden />
            {t("contractor.job.startCta")}
          </Button>
          <div className="mt-4">
            <PhotoUpload
              label={t("contractor.job.beforePhotoLabel")}
              value={beforePhoto}
              onChange={setBeforePhoto}
              simulateName={t("contractor.job.beforePhotoSimulateName")}
            />
          </div>
        </section>
      )}

      {request.status === "IN_PROGRESS" && (
        <section className="surface-card mt-4 space-y-4 p-5">
          <h3 className="text-sm font-semibold">{t("contractor.job.closeTitle")}</h3>
          <div className="space-y-1.5">
            <Label htmlFor="comment">{t("contractor.job.reportLabel")}</Label>
            <Textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("contractor.job.reportPlaceholder")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PhotoUpload
              label={t("contractor.job.beforePhotoLabelPlain")}
              value={beforePhoto}
              onChange={setBeforePhoto}
              simulateName={t("contractor.job.beforePhotoSimulateName")}
            />
            <PhotoUpload
              label={t("contractor.job.afterPhotoLabelPlain")}
              value={afterPhoto}
              onChange={setAfterPhoto}
              simulateName={t("contractor.job.afterPhotoSimulateName")}
            />
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={comment.trim().length < 5}
            onClick={() => {
              void (async () => {
                if (beforePhoto) await photosApi.upload(request.id, beforePhoto, "before");
                if (afterPhoto) await photosApi.upload(request.id, afterPhoto, "after");
                await requestsApi.transition(request.id, { to: "COMPLETED", comment: comment.trim() });
                await refreshApiState(session ?? undefined);
                setComment("");
                setBeforePhoto(null);
                setAfterPhoto(null);
                toast.success(t("contractor.job.completedToast"));
              })().catch(() => toast.error("Action impossible."));
            }}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            {t("contractor.job.completeCta")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("contractor.job.completeHint")}
          </p>
        </section>
      )}

      {["COMPLETED", "CONTROLLED", "CLOSED"].includes(request.status) && (
        <section className="surface-card mt-4 p-5">
          <h3 className="text-sm font-semibold">{t("contractor.job.doneTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("contractor.job.doneDescription")}
          </p>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">{t("contractor.job.citizenPhotosTitle")}</h3>
          <div className="mt-3">
            <PhotoGrid photos={citizenPhotos} empty={t("contractor.job.citizenPhotosEmpty")} />
          </div>
        </section>
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold">{t("contractor.job.workPhotosTitle")}</h3>
          <div className="mt-3">
            <PhotoGrid photos={workPhotos} empty={t("contractor.job.workPhotosEmpty")} />
          </div>
        </section>
      </div>

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">{t("contractor.job.notesTitle")}</h3>
        <ul className="mt-3 space-y-3">
          {request.contractorNotes.length === 0 && (
            <li className="text-sm text-muted-foreground">{t("contractor.job.notesEmpty")}</li>
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

      <section className="surface-card mt-4 p-5">
        <h3 className="text-sm font-semibold">{t("contractor.job.historyTitle")}</h3>
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
  value: File | null;
  onChange: (value: File | null) => void;
  simulateName: string;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="truncate">{value.name}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t("contractor.job.photoRemove")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <ImagePlus className="size-4" aria-hidden />
            {t("contractor.job.photoAdd")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
