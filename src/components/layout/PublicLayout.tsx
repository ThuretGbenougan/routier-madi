import { Link } from "@tanstack/react-router";
import { TrafficCone } from "lucide-react";
import type { ReactNode } from "react";
import { appName, cityName } from "@/i18n/fr";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrafficCone className="size-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">{appName}</span>
              <span className="block text-xs text-muted-foreground">{cityName}</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/report"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Signaler
            </Link>
            <Link
              to="/track"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Suivre
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div>
            <p className="font-semibold">{appName}</p>
            <p className="mt-1 text-muted-foreground">
              Service de la voirie · {cityName}
            </p>
          </div>
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Aide et contact</p>
            <p className="mt-1">Accueil voirie : 01 45 00 12 12</p>
            <p>voirie@valmont.fr</p>
            <p>Du lundi au vendredi, 8h30 – 17h30</p>
          </div>
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Accès professionnels</p>
            <Link to="/admin/login" className="mt-1 block hover:text-foreground">
              Espace administration
            </Link>
            <Link to="/contractor/login" className="block hover:text-foreground">
              Espace entreprise
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
