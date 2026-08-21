import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

import { env } from "@/lib/env";
import type { StreamAnswerInput, TextGenerator } from "./types";

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

      return result.toUIMessageStreamResponse();
    },
  };
}
