import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

/** Lingua scelta dall'utente, con fallback su quella di default. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;

  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Dizionario per i Server Component, che non possono usare il context. */
export async function getTranslations(): Promise<{
  locale: Locale;
  t: Dictionary;
}> {
  const locale = await getLocale();

  return { locale, t: getDictionary(locale) };
}
