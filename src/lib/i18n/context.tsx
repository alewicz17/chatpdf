"use client";

import { createContext, useContext } from "react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type LocaleContextValue = {
  locale: Locale;
  t: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Rende dizionario e lingua disponibili alle isole interattive. Il valore arriva
 * gia' risolto dal server: i Client Component non leggono il cookie.
 */
export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslations(): LocaleContextValue {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("useTranslations richiede un LocaleProvider a monte.");
  }

  return value;
}
