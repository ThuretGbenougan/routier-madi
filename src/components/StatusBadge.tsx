import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import type { RequestStatus } from "@/types";

const styles: Record<RequestStatus, string> = {
  CREATED: "bg-muted text-muted-foreground border-border",
  VERIFIED: "bg-info/10 text-info border-info/25",
  ASSIGNED: "bg-primary/10 text-primary border-primary/25",
  IN_PROGRESS: "bg-warning/15 text-warning border-warning/30",
  COMPLETED: "bg-success/12 text-success border-success/25",
  CONTROLLED: "bg-success/15 text-success border-success/30",
  CLOSED: "bg-secondary text-secondary-foreground border-border",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/25",
};

export function StatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: RequestStatus;
  className?: string;
  size?: "sm" | "lg";
}) {
  const { statusLabel } = useI18n();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}
