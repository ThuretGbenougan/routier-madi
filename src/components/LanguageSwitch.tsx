import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { languages, type Lang } from "@/i18n";
import { cn } from "@/lib/utils";

const shortLabel: Record<Lang, string> = { fr: "FR", ru: "RU" };

export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-background p-0.5",
        className,
      )}
    >
      <Languages className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
      {languages.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {shortLabel[code]}
        </button>
      ))}
    </div>
  );
}
