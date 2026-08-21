import "server-only";

import { createGeminiEmbeddingProvider } from "./gemini";
import { createGroqTextGenerator } from "./groq";
import type { EmbeddingProvider, TextGenerator } from "./types";

export type {
  ChatMessage,
  EmbeddingProvider,
  StreamAnswerInput,
  TextGenerator,
} from "./types";

/**
 * Factory dell'adapter di embedding: ritorna una nuova istanza a ogni chiamata.
 * Unico punto in cui si risolve la chiave API (default oppure BYOK).
 */
export function getEmbeddingProvider(apiKey?: string): EmbeddingProvider {
  return createGeminiEmbeddingProvider(apiKey);
}

/**
 * Factory dell'adapter di generazione: ritorna una nuova istanza a ogni chiamata.
 * Unico punto in cui si risolve la chiave API (default oppure BYOK).
 */
export function getTextGenerator(apiKey?: string): TextGenerator {
  return createGroqTextGenerator(apiKey);
}
