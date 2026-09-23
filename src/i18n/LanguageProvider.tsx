import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ProblemType, RequestStatus, Role } from "@/types";
import { translate, type Lang, type Translate, type TranslationKey } from "./index";

const STORAGE_KEY = "voirie-connect-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
  statusLabel: (status: RequestStatus) => string;
  problemLabel: (problem: ProblemType) => string;
  roleLabel: (role: Role | "CITIZEN") => string;
  text: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "ru") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t: Translate = (key, vars) => translate(lang, key, vars);
    return {
      lang,
      setLang,
      t,
      statusLabel: (status) => t(`status.${status}` as TranslationKey),
      problemLabel: (problem) => t(`problem.${problem}` as TranslationKey),
      roleLabel: (role) => t(`role.${role}` as TranslationKey),
      text: (value) => (value.startsWith("seed.") ? t(value as TranslationKey) : value),
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}
