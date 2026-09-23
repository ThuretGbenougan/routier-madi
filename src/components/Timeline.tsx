import { Check, Circle } from "lucide-react";
import { statusOrder } from "@/i18n/fr";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HistoryEntry, RequestStatus } from "@/types";

export function LifecycleTimeline({
  status,
  history,
}: {
  status: RequestStatus;
  history: HistoryEntry[];
}) {
  const { t, lang, statusLabel } = useI18n();

  if (status === "REJECTED") {
    return (
      <p className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
        {t("timeline.rejected")}
      </p>
    );
  }
  const current = statusOrder.indexOf(status);
  return (
    <ol className="grid gap-2 sm:grid-cols-7">
      {statusOrder.map((s, i) => {
        const done = i <= current;
        const entry = history.find((h) => h.status === s);
        return (
          <li key={s} className="flex gap-2 sm:block">
            <div className="flex items-center gap-1 sm:mb-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px]",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  i < current ? "bg-primary" : "bg-border",
                )}
              />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-medium",
                  done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {statusLabel(s)}
              </p>
              {entry && (
                <p className="text-[11px] text-muted-foreground">
                  {formatDateTime(entry.at, lang)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function HistoryList({ history }: { history: HistoryEntry[] }) {
  const { t, lang, statusLabel, roleLabel } = useI18n();

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("timeline.empty")}</p>;
  }

  return (
    <ol className="space-y-4">
      {[...history].reverse().map((h) => (
        <li key={h.id} className="relative pl-6">
          <Circle className="absolute top-1 left-0 size-3 fill-primary text-primary" aria-hidden />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium">{statusLabel(h.status)}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(h.at, lang)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {h.actor} · {roleLabel(h.role)}
          </p>
          {h.comment && <p className="mt-1 text-sm">{h.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
