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

const tones = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/10 text-info border-info/25",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
};

const states = {
  account: {
    ACTIVE: ["users.ACTIVE", "success"],
    PENDING: ["users.PENDING", "warning"],
    DISABLED: ["users.DISABLED", "neutral"],
  },
  access: {
    NONE: ["invite.status.NONE", "neutral"],
    ACTIVE: ["invite.status.ACTIVE", "success"],
    PENDING: ["invite.status.PENDING", "warning"],
    EXPIRED: ["invite.status.EXPIRED", "warning"],
    DISABLED: ["invite.status.DISABLED", "neutral"],
  },
  invitation: {
    NONE: ["users.NONE", "neutral"],
    PENDING: ["invite.status.PENDING", "warning"],
    EXPIRED: ["invite.status.EXPIRED", "warning"],
    CONSUMED: ["users.CONSUMED", "success"],
  },
  delivery: {
    PENDING: ["invite.delivery.PENDING", "warning"],
    ACCEPTED: ["invite.delivery.ACCEPTED", "info"],
    FAILED: ["invite.delivery.FAILED", "danger"],
  },
} as const;

type Domain = keyof typeof states;
type StatusProps =
  | { domain?: "request"; status: RequestStatus }
  | { [D in Domain]: { domain: D; status: keyof (typeof states)[D] } }[Domain];

export function StatusBadge(props: StatusProps & { className?: string; size?: "sm" | "lg" }) {
  const { t, statusLabel } = useI18n();
  const { className, size = "sm" } = props;
  let label: string;
  let style: string;
  if (props.domain === undefined || props.domain === "request") {
    label = statusLabel(props.status);
    style = styles[props.status];
  } else {
    // Narrow each domain to keep overlapping status names type-safe.
    const entry =
      props.domain === "account"
        ? states.account[props.status]
        : props.domain === "access"
          ? states.access[props.status]
          : props.domain === "invitation"
            ? states.invitation[props.status]
            : props.domain === "delivery"
              ? states.delivery[props.status]
              : undefined;
    if (!entry) throw new Error("Unknown status domain");
    label = t(entry[0]);
    style = tones[entry[1]];
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
        style,
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
