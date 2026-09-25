import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin, SearchX } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { HistoryList, LifecycleTimeline } from "@/components/Timeline";
import { PhotoGrid } from "@/components/PhotoTile";
import { formatDate, formatDateTime } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { requestsApi } from "@/lib/api/requests-api";
import { useI18n } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/track/$reference")({
  validateSearch: (search: Record<string, unknown>) => ({ code: typeof search["code"] === "string" ? search["code"] : "" }),
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
  const { t, lang, problemLabel } = useI18n();
  const { reference } = Route.useParams();
  const { code } = Route.useSearch();
  const query = useQuery({ queryKey: ["public-request", reference, code], queryFn: () => requestsApi.publicByReference(reference, code), enabled: Boolean(code) });
  const request = query.data?.request;

  if (!request) {
    return (
      <PublicLayout>
        <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-semibold">
            {query.isLoading ? t("track.detail.searching") : t("track.detail.notFound.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("track.detail.notFound.text", { reference })}
          </p>
          <Button asChild className="mt-6">
            <Link to="/track">{t("track.detail.notFound.retry")}</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

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
          {t("track.detail.back")}
        </Link>

        <header className="surface-card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("track.detail.reference")}</p>
              <h1 className="text-xl font-semibold tracking-wide">{request.reference}</h1>
            </div>
            <StatusBadge status={request.status} size="lg" />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">{t("track.detail.location")}</dt>
                <dd>
                  {t("track.detail.locationValue", {
                    address: request.address,
                    district: request.district,
                  })}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">{t("track.detail.filedOn")}</dt>
                <dd>{formatDate(request.createdAt, lang)}</dd>
              </div>
            </div>
          </dl>
        </header>

        <section className="surface-card mt-4 p-5">
          <h2 className="text-sm font-semibold">{t("track.detail.progress")}</h2>
          <div className="mt-4">
            <LifecycleTimeline status={request.status} history={request.history} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("track.detail.lastUpdate", { date: formatDateTime(request.updatedAt, lang) })}
          </p>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">{t("track.detail.request")}</h2>
            <p className="mt-3 text-xs text-muted-foreground">{t("track.detail.problemType")}</p>
            <p className="text-sm">{problemLabel(request.problemType)}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("track.detail.description")}</p>
            <p className="text-sm">{request.description}</p>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">{t("track.detail.photos")}</h2>
            <div className="mt-3">
              <PhotoGrid photos={citizenPhotos} empty={t("photo.none")} />
            </div>
            {workPhotos.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">{t("track.detail.workPhotos")}</h3>
                <div className="mt-3">
                  <PhotoGrid photos={workPhotos} />
                </div>
              </>
            )}
          </section>
        </div>

        <section className="surface-card mt-4 p-5">
          <h2 className="text-sm font-semibold">{t("track.detail.history")}</h2>
          <div className="mt-4">
            <HistoryList history={request.history} />
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
