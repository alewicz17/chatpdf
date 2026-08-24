/** Lingue supportate dall'interfaccia. La prima e' quella di default. */
export const LOCALES = ["en", "it"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie con la lingua scelta: letto dal server, scritto dal selettore. */
export const LOCALE_COOKIE = "locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Tag BCP 47 per `Intl` e per l'attributo `lang` del documento. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  it: "it-IT",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Salva la lingua scelta nel cookie letto dal server. Solo lato browser. */
export function persistLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/** Sostituisce i segnaposto `{nome}` con i valori passati. */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
