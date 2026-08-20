import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

import { env } from "@/lib/env";
import type { EmbeddingProvider } from "./types";

/**
 * Adapter di embedding su Gemini.
 * `apiKey` sovrascrive quella di default (BYOK); nuova istanza a ogni chiamata.
 */
export function createGeminiEmbeddingProvider(apiKey?: string): EmbeddingProvider {
  const google = createGoogleGenerativeAI({ apiKey: apiKey ?? env.googleApiKey() });
  const model = google.embedding(env.embeddingModel);

  return {
    model: env.embeddingModel,
    dimensions: env.embeddingDimensions,

    async embedDocuments(texts) {
      if (texts.length === 0) return [];

      const { embeddings } = await embedMany({
        model,
        values: texts,
        providerOptions: {
          google: {
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: env.embeddingDimensions,
          },
        },
      });

      return embeddings;
    },

    async embedQuery(text) {
      const { embedding } = await embed({
        model,
        value: text,
        providerOptions: {
          google: {
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: env.embeddingDimensions,
          },
        },
      });

      return embedding;
    },
  };
}
