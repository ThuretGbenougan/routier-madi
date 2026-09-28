import { common } from "./dicts/common";
import { citizen } from "./dicts/citizen";
import { citizenReport } from "./dicts/citizen-report";
import { admin } from "./dicts/admin";
import { contractor } from "./dicts/contractor";

import { mlWorkflow } from "./dicts/ml-workflow";

import { requestLocation } from "./dicts/request-location";

export type Lang = "fr" | "ru";

export const languages: Lang[] = ["fr", "ru"];

export const dictionaries = {
  fr: {
    ...common.fr,
    ...requestLocation.fr,
    ...citizen.fr,
    ...citizenReport.fr,
    ...admin.fr,
    ...contractor.fr,
    ...mlWorkflow.fr,
  },
  ru: {
    ...common.ru,
    ...requestLocation.ru,
    ...citizen.ru,
    ...citizenReport.ru,
    ...admin.ru,
    ...contractor.ru,
    ...mlWorkflow.ru,
  },
};

export type TranslationKey = keyof (typeof dictionaries)["fr"];

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const table = dictionaries[lang] as Record<string, string>;
  const fallback = dictionaries.fr as Record<string, string>;
  let text = table[key] ?? fallback[key] ?? String(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export const localeOf: Record<Lang, string> = {
  fr: "fr-FR",
  ru: "ru-RU",
};
