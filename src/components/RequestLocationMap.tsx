import { MapPin } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";

export function RequestLocationMap({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const { t, lang } = useI18n();
  const valid =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180;
  const params = valid
    ? new URLSearchParams({
        ll: `${lng},${lat}`,
        pt: `${lng},${lat},pm2rdm`,
        z: "16",
        lang: lang === "ru" ? "ru_RU" : "en_US",
      }).toString()
    : null;

  return (
    <section className="surface-card mt-4 space-y-3 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="size-4" aria-hidden />
        {t("requestLocation.title")}
      </h3>
      {valid && params ? (
        <>
          <iframe
            key={params}
            title={t("requestLocation.title")}
            src={`https://yandex.com/map-widget/v1/?${params}`}
            className="h-72 w-full rounded-lg border border-border bg-muted sm:h-80"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="text-sm">
            {t("requestLocation.coordinates", {
              lat: lat.toFixed(5),
              lng: lng.toFixed(5),
            })}
          </p>
          <p className="text-xs text-muted-foreground">{t("requestLocation.help")}</p>
          <a
            href={`https://yandex.com/maps/?${params}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary underline underline-offset-4"
          >
            {t("requestLocation.open")}
          </a>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("requestLocation.missing")}</p>
      )}
    </section>
  );
}
