import "server-only";

import { createGeminiEmbeddingProvider } from "./gemini";
import type { EmbeddingProvider } from "./types";

export type { EmbeddingProvider } from "./types";

/**
 * Factory dell'adapter di embedding: ritorna una nuova istanza a ogni chiamata.
 * Unico punto in cui si risolve la chiave API (default oppure BYOK).
 */
export function getEmbeddingProvider(apiKey?: string): EmbeddingProvider {
  return createGeminiEmbeddingProvider(apiKey);
}
