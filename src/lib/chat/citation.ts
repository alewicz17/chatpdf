import { LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Etichetta della citazione per lingua. Il modello la emette seguendo il system
 * prompt e la chat la riconosce nella risposta: le due cose vanno tenute qui,
 * in un posto solo.
 */
export const CITATION_LABELS: Record<Locale, string> = {
  en: "Page",
  it: "Pagina",
};

const LABELS_PATTERN = LOCALES.map((locale) => CITATION_LABELS[locale]).join("|");

/** Separatore tra i numeri di una citazione multipla: `3, 5` oppure `3 e 5`. */
const PAGE_SEPARATOR = "(?:,|\\s+(?:e|and)\\s+)";

/**
 * `[Pagina 3, 5]` / `[Page 3 and 5]`. Le etichette sono tutte quelle conosciute,
 * non solo quella della lingua attiva: una conversazione salvata puo' contenere
 * risposte generate prima di un cambio di lingua.
 */
export const CITATION_PATTERN = new RegExp(
  `\\[\\s*(?:${LABELS_PATTERN})\\s+(\\d+(?:\\s*${PAGE_SEPARATOR}\\s*\\d+)*)\\s*\\]`,
  "gi",
);

export const CITATION_PAGE_SEPARATOR = new RegExp(`\\s*${PAGE_SEPARATOR}\\s*`);

/** Ancora interna di una citazione: non dipende dalla lingua della risposta. */
export function citationHref(page: number | string): string {
  return `#page-${page}`;
}

export const CITATION_HREF_PATTERN = /^#page-(\d+)$/;
