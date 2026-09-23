import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { History, LogOut, Wrench } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DemoResetButton } from "@/components/DemoResetButton";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { logout, useDemoState, useHydrated } from "@/lib/store";

const nav = [
  { to: "/contractor/jobs", key: "shell.nav.jobs", icon: Wrench },
  { to: "/contractor/history", key: "shell.nav.history", icon: History },
] as const;

export function ContractorShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { session, contractors } = useDemoState();
  const { t } = useI18n();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (hydrated && (!session || session.role !== "CONTRACTOR")) {
      navigate({ to: "/contractor/login" });
    }
  }, [hydrated, session, navigate]);

  if (!session || session.role !== "CONTRACTOR") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t("shell.session.checking")}
      </div>
    );
  }

  const company = contractors.find((c) => c.id === session.contractorId);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{company?.name ?? t("app.name")}</p>
            <p className="truncate text-xs text-muted-foreground">{session.name}</p>
          </div>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 transition-colors",
                  pathname.startsWith(item.to)
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("action.logout")}
            onClick={() => {
              logout();
              navigate({ to: "/contractor/login" });
            }}
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <DemoResetButton />
          </div>
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-border bg-surface sm:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 py-3 text-xs",
              pathname.startsWith(item.to) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
