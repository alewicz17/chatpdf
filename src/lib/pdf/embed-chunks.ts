import "server-only";

import type { EmbeddingProvider } from "@/lib/ai";
import type { PdfChunk } from "./chunk-pages";

export type EmbeddedChunk = PdfChunk & {
  embedding: number[];
};

// Batch conservativo: tiene le richieste sotto i limiti per chiamata del provider.
const BATCH_SIZE = 64;

/** Vettorializza i chunk a batch, preservando l'ordine di `chunks`. */
export async function embedChunks(
  chunks: PdfChunk[],
  provider: EmbeddingProvider,
): Promise<EmbeddedChunk[]> {
  const embedded: EmbeddedChunk[] = [];

  for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
    const batch = chunks.slice(start, start + BATCH_SIZE);
    const embeddings = await provider.embedDocuments(
      batch.map((chunk) => chunk.content),
    );

    if (embeddings.length !== batch.length) {
      throw new Error(
        `Embedding incompleti: attesi ${batch.length}, ricevuti ${embeddings.length}`,
      );
    }

    batch.forEach((chunk, index) => {
      embedded.push({ ...chunk, embedding: embeddings[index] });
    });
  }

  return embedded;
}
