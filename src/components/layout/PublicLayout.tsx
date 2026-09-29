import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/i18n/LanguageProvider";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">{t("app.name")}</span>
              <span className="block text-xs text-muted-foreground">{t("app.city")}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <Link
                to="/report"
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t("public.nav.report")}
              </Link>
              <Link
                to="/track"
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t("public.nav.track")}
              </Link>
            </nav>
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div>
            <p className="font-semibold">{t("app.name")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("public.footer.service")} · {t("app.city")}
            </p>
          </div>
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">{t("public.footer.helpTitle")}</p>
            <p className="mt-1">{t("public.footer.phone")}</p>
            <p>voirie@valmont.fr</p>
            <p>{t("public.footer.hours")}</p>
          </div>
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">{t("public.footer.proTitle")}</p>
            <Link to="/admin/login" className="mt-1 block hover:text-foreground">
              {t("public.footer.adminSpace")}
            </Link>
            <Link to="/contractor/login" className="block hover:text-foreground">
              {t("public.footer.contractorSpace")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
