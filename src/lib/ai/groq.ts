import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

import { env } from "@/lib/env";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { classifyProviderError, providerErrorMessage } from "./errors";
import type { StreamAnswerInput, TextGenerator } from "./types";

/**
 * Traduce l'errore del provider in un messaggio mostrabile all'utente.
 * Serve soprattutto in BYOK e quando la quota del provider e' esaurita: senza
 * questo la UI mostrerebbe un errore generico e sembrerebbe un guasto dell'app.
 */
function toUserMessage(error: unknown, t: Dictionary): string {
  const kind = classifyProviderError(error);

  return kind ? providerErrorMessage(kind, t) : t.api.generationFailed;
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

    streamAnswer({ system, messages, t }: StreamAnswerInput) {
      const result = streamText({
        model,
        system,
        messages,
        // Risposta ancorata al contesto: poca liberta' creativa.
        temperature: 0.2,
      });

      return result.toUIMessageStreamResponse({
        onError: (error) => toUserMessage(error, t),
      });
    },
  };
}
