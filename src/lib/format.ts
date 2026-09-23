import { localeOf, type Lang } from "@/i18n";

export function formatDate(value: string, lang: Lang = "fr"): string {
  return new Date(value).toLocaleDateString(localeOf[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: string, lang: Lang = "fr"): string {
  return new Date(value).toLocaleString(localeOf[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysBetween(a: string, b: string): number {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function formatDuration(days: number, lang: Lang = "fr"): string {
  if (!Number.isFinite(days)) return "—";
  if (days < 1) return lang === "ru" ? "менее одного дня" : "moins d'un jour";
  const rounded = Math.round(days * 10) / 10;
  const value = rounded.toLocaleString(localeOf[lang]);
  if (lang === "ru") return `${value} дн.`;
  return `${value} jour${rounded >= 2 ? "s" : ""}`;
}
