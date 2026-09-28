import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { photosApi } from "@/lib/api/photos-api";
import { refreshApiState } from "@/lib/api/app-state";
import { Camera, ImageOff } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import type { Photo } from "@/types";

function hue(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function PhotoTile({ photo }: { photo: Photo }) {
  const { t } = useI18n();
  const h = hue(photo.seed);
  const [retrying, setRetrying] = useState(false);
  const analysis = photo.analysis;
  const kindLabel =
    photo.kind === "citizen"
      ? t("photo.citizen")
      : photo.kind === "before"
        ? t("photo.before")
        : t("photo.after");

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-muted">
      {photo.url ? (
        <div className="relative">
          <img src={photo.url} alt={photo.label} className="block h-auto w-full" loading="lazy" />
          {analysis?.status === "SUCCEEDED" && analysis.width && analysis.height && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${analysis.width} ${analysis.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {analysis.detections.map((d, i) => (
                <rect
                  key={i}
                  x={d.box[0]}
                  y={d.box[1]}
                  width={d.box[2] - d.box[0]}
                  height={d.box[3] - d.box[1]}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
        </div>
      ) : (
        <div
          className="flex aspect-4/3 items-center justify-center"
          style={{
            background: `linear-gradient(135deg, oklch(0.78 0.04 ${h}), oklch(0.62 0.05 ${(h + 40) % 360}))`,
          }}
        >
          <Camera className="size-7 text-white/85" aria-hidden />
        </div>
      )}
      <figcaption className="px-2.5 py-2 text-xs text-muted-foreground">
        <span className="block font-medium text-foreground">{photo.label}</span>
        {kindLabel}
        {analysis && (
          <div className="mt-2 space-y-1 border-t pt-2">
            <p role="status" className="font-medium">
              {t(`ml.${analysis.status}`)}
            </p>
            {analysis.status === "SUCCEEDED" &&
              (analysis.detections.length ? (
                <ul>
                  {analysis.detections.map((d, i) => (
                    <li key={i}>
                      {d.label} · {Math.round(d.confidence * 100)} %
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("ml.empty")}</p>
              ))}
            {analysis.modelVersion && (
              <p>{t("ml.version", { version: analysis.modelVersion.slice(0, 12) })}</p>
            )}
            {analysis.durationMs !== null && (
              <p>{t("ml.duration", { duration: Math.round(analysis.durationMs) })}</p>
            )}
            {analysis.failureCode && <p>{t("ml.failure", { code: analysis.failureCode })}</p>}
            {analysis.status === "FAILED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={retrying}
                onClick={async () => {
                  setRetrying(true);
                  try {
                    await photosApi.retry(photo.id);
                    await refreshApiState();
                    toast.success(t("ml.retrySaved"));
                  } catch {
                    toast.error(t("ml.retryError"));
                  } finally {
                    setRetrying(false);
                  }
                }}
              >
                {t("ml.retry")}
              </Button>
            )}
            <p>{t("ml.hint")}</p>
          </div>
        )}
      </figcaption>
    </figure>
  );
}

export function PhotoGrid({ photos, empty }: { photos: Photo[]; empty?: string }) {
  const { t } = useI18n();

  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ImageOff className="size-4" aria-hidden />
        {empty ?? t("photo.none")}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p) => (
        <PhotoTile key={p.id} photo={p} />
      ))}
    </div>
  );
}
