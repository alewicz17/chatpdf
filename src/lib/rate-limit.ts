import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitRule = {
  /** Contatore separato: ogni route ha il suo, non si consumano a vicenda. */
  bucket: string;
  /** Richieste consentite nella finestra. */
  limit: number;
  windowSeconds: number;
};

/**
 * Quote per utente. Servono a contenere il costo dei provider AI, non a
 * difendere i dati: l'autorizzazione la fanno i controlli di proprieta'.
 */
export const RATE_LIMITS = {
  /** Domande in chat: una conversazione fitta resta comodamente sotto. */
  chat: { bucket: "chat", limit: 30, windowSeconds: 5 * 60 },
  /**
   * Slice di ingestion. Il client chiama la route in ciclo, una slice per
   * volta: il limite deve coprire l'indicizzazione di un PDF lungo (128 chunk
   * a invocazione) senza interromperla a meta'.
   */
  processPdf: { bucket: "process_pdf", limit: 60, windowSeconds: 10 * 60 },
  /** Documenti registrati dopo l'upload su Storage. */
  createDocument: { bucket: "create_document", limit: 20, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Secondi da attendere prima di riprovare; 0 quando la richiesta passa. */
  retryAfter: number;
};

type ConsumeRateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after: number;
};

/**
 * Consuma una richiesta della quota dell'utente.
 *
 * In caso di errore del database lascia passare: il rate limiting protegge dai
 * costi, non dagli accessi, e non deve diventare il motivo per cui l'app smette
 * di funzionare. L'errore va comunque nei log.
 */
export async function consumeRateLimit(
  userId: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_user_id: userId,
    p_bucket: rule.bucket,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    console.error(`RPC consume_rate_limit (${rule.bucket}) fallita:`, error.message);
    return { allowed: true, remaining: rule.limit, retryAfter: 0 };
  }

  const row = (data as ConsumeRateLimitRow[] | null)?.[0];

  if (!row) {
    console.error(`RPC consume_rate_limit (${rule.bucket}) senza risultato`);
    return { allowed: true, remaining: rule.limit, retryAfter: 0 };
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    retryAfter: row.retry_after,
  };
}

/** Formatta l'attesa residua in un'indicazione leggibile. */
function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "o" : "i"}`;

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minut${minutes === 1 ? "o" : "i"}`;
}

/** Risposta 429 con `Retry-After`, coerente per tutte le route. */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: `Troppe richieste: riprova tra ${formatRetryAfter(result.retryAfter)}.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfter) },
    },
  );
}
