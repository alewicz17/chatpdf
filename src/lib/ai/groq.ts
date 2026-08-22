import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { APICallError, streamText } from "ai";

import { env } from "@/lib/env";
import type { StreamAnswerInput, TextGenerator } from "./types";

/**
 * Traduce l'errore del provider in un messaggio mostrabile all'utente.
 * Serve soprattutto in BYOK: senza questo la UI mostrerebbe solo un errore generico.
 */
function toUserMessage(error: unknown): string {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "Chiave API rifiutata dal provider: controllala e riprova.";
    }

    if (error.statusCode === 429) {
      return "Limite di richieste raggiunto sul provider: riprova tra poco.";
    }
  }

  return "La risposta si e' interrotta prima di arrivare.";
}

/**
 * Adapter di generazione su Groq.
 * `apiKey` sovrascrive quella di default (BYOK); nuova istanza a ogni chiamata.
 */
export function createGroqTextGenerator(apiKey?: string): TextGenerator {
  const groq = createGroq({ apiKey: apiKey ?? env.groqApiKey() });
  const model = groq(env.generationModel);

  return {
    model: env.generationModel,

    streamAnswer({ system, messages }: StreamAnswerInput) {
      const result = streamText({
        model,
        system,
        messages,
        // Risposta ancorata al contesto: poca liberta' creativa.
        temperature: 0.2,
      });

      return result.toUIMessageStreamResponse({ onError: toUserMessage });
    },
  };
}
