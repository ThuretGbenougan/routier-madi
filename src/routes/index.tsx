import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardCheck, MapPin, Search, Send } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { requestsApi } from "@/lib/api/requests-api";
import { formatDuration } from "@/lib/format";
import { useI18n } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signaler un problème de voirie — Ville de Valmont" },
      {
        name: "description",
        content:
          "Signalez un problème dans votre rue au service voirie et consultez l’avancement de votre demande avec votre numéro de suivi.",
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

function Index() {
  const { t, lang } = useI18n();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["public-stats"],
    queryFn: requestsApi.publicStats,
  });
  const statsData = isError ? undefined : data;
  const durationUnavailable =
    statsData &&
    (statsData.closed === 0 ||
      !Number.isFinite(statsData.averageDurationDays) ||
      statsData.averageDurationDays < 0);

  const steps = [
    {
      icon: Send,
      title: t("home.steps.report.title"),
      text: t("home.steps.report.text"),
    },
    {
      icon: ClipboardCheck,
      title: t("home.steps.assign.title"),
      text: t("home.steps.assign.text"),
    },
    {
      icon: CheckCircle2,
      title: t("home.steps.track.title"),
      text: t("home.steps.track.text"),
    },
  ];

  const stats = [
    { value: statsData ? String(statsData.total) : "—", label: t("home.stats.received") },
    { value: statsData ? String(statsData.inProgress) : "—", label: t("home.stats.inProgress") },
    { value: statsData ? String(statsData.closed) : "—", label: t("home.stats.closed") },
    {
      value: !statsData
        ? "—"
        : durationUnavailable
          ? t("home.stats.unavailable")
          : statsData.averageDurationDays < 1
            ? t("home.stats.lessThanDay")
            : formatDuration(statsData.averageDurationDays, lang),
      label: t("home.stats.avgDuration"),
      compact: Boolean(durationUnavailable),
    },
  ];

  return (
    <PublicLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {t("home.hero.badge")}
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("home.hero.title")}
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">{t("home.hero.subtitle")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 text-base">
              <Link to="/report">
                {t("home.action.report")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 text-base">
              <Link to="/track">
                <Search className="size-4" aria-hidden />
                {t("home.action.track")}
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("home.hero.noAccount")}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-xl font-semibold">{t("home.steps.title")}</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="surface-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {t("home.steps.step", { count: i + 1 })}
                </span>
              </div>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <h2 className="text-xl font-semibold">{t("home.stats.title")}</h2>
          {isPending && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              {t("home.stats.loading")}
            </p>
          )}
          {isError && (
            <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <p>{t("home.stats.error")}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                {t("home.stats.retry")}
              </Button>
            </div>
          )}
          <dl aria-busy={isPending} className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-4">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd
                  className={`mt-1 font-semibold ${s.compact ? "text-base" : "text-xl sm:text-2xl"}`}
                >
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{t("home.stats.durationHelp")}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("home.help.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.help.text")}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/track">{t("home.action.track")}</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
