import "server-only";

import { APICallError, RetryError } from "ai";

import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Categoria di errore del provider AI, per distinguere i casi che l'utente puo'
 * capire e risolvere da un guasto generico.
 */
export type ProviderErrorKind = "quota" | "rate-limit" | "auth";

/** Frammenti che i provider usano per segnalare credito/quota esaurita. */
const QUOTA_HINTS = [
  "exceeded your current quota",
  "resource_exhausted",
  "insufficient_quota",
  "billing",
  "quota",
];

/** Estrae l'`APICallError` originale, anche quando e' avvolto dai retry dell'SDK. */
function unwrapApiCallError(error: unknown): APICallError | null {
  if (APICallError.isInstance(error)) return error;

  if (RetryError.isInstance(error)) {
    for (let i = error.errors.length - 1; i >= 0; i -= 1) {
      const inner = unwrapApiCallError(error.errors[i]);
      if (inner) return inner;
    }
  }

  if (error instanceof Error && error.cause) {
    return unwrapApiCallError(error.cause);
  }

  return null;
}

function mentionsQuota(error: APICallError): boolean {
  const haystack = `${error.message} ${
    typeof error.responseBody === "string" ? error.responseBody : ""
  }`.toLowerCase();

  return QUOTA_HINTS.some((hint) => haystack.includes(hint));
}

/**
 * Classifica un errore arrivato da un provider AI.
 * Ritorna `null` quando non e' riconducibile a quota, limite di richieste o chiave.
 */
export function classifyProviderError(error: unknown): ProviderErrorKind | null {
  const apiError = unwrapApiCallError(error);

  if (!apiError) return null;

  if (apiError.statusCode === 401 || apiError.statusCode === 403) {
    return "auth";
  }

  if (apiError.statusCode === 429 || mentionsQuota(apiError)) {
    return mentionsQuota(apiError) ? "quota" : "rate-limit";
  }

  return null;
}

/** Messaggio da mostrare all'utente per una categoria di errore del provider. */
export function providerErrorMessage(
  kind: ProviderErrorKind,
  t: Dictionary,
): string {
  switch (kind) {
    case "quota":
      return t.api.aiQuotaExceeded;
    case "rate-limit":
      return t.api.aiRateLimited;
    case "auth":
      return t.api.aiKeyRejected;
  }
}
