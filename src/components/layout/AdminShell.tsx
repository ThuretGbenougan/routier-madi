import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  TrafficCone,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DemoResetButton } from "@/components/DemoResetButton";
import { appName, cityName } from "@/i18n/fr";
import { cn } from "@/lib/utils";
import { logout, useDemoState, useHydrated } from "@/lib/store";

const nav = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/requests", label: "Demandes", icon: ClipboardList },
  { to: "/admin/contractors", label: "Entreprises", icon: Users },
  { to: "/admin/reports", label: "Rapports", icon: BarChart3 },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4.5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { session } = useDemoState();
  const hydrated = useHydrated();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && (!session || session.role !== "ADMIN")) {
      navigate({ to: "/admin/login" });
    }
  }, [hydrated, session, navigate]);

  if (!session || session.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Vérification de la session…
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar p-4 text-sidebar-foreground">
      <Link to="/admin/dashboard" className="mb-6 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <TrafficCone className="size-5" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">{appName}</span>
          <span className="block text-xs text-sidebar-foreground/65">{cityName}</span>
        </span>
      </Link>
      <NavLinks />
      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        <div className="text-xs">
          <p className="font-medium">{session.name}</p>
          <p className="text-sidebar-foreground/65">{session.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => {
            logout();
            navigate({ to: "/admin/login" });
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Se déconnecter
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="size-5" aria-hidden />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 border-0 p-0">
                <SheetTitle className="sr-only">Navigation administration</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{title}</h1>
              {description && (
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <DemoResetButton className="hidden sm:inline-flex" />
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
