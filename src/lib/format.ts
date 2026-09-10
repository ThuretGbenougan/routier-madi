export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
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

export function formatDuration(days: number): string {
  if (!Number.isFinite(days)) return "—";
  if (days < 1) return "moins d'un jour";
  const rounded = Math.round(days * 10) / 10;
  return `${rounded.toLocaleString("fr-FR")} jour${rounded >= 2 ? "s" : ""}`;
}
