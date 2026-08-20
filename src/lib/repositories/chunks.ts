import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ChunkInput = {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  embedding: number[];
};

// Insert a blocchi: un PDF lungo produce migliaia di righe con un vettore ciascuna.
const INSERT_BATCH_SIZE = 100;

/** Rimuove i chunk di un documento: rende ripetibile l'ingestion. */
export async function deleteChunksByDocument(documentId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    throw new Error(`Delete su document_chunks fallito: ${error.message}`);
  }
}

/** Salva i chunk vettorializzati di un documento. */
export async function insertChunks(
  documentId: string,
  chunks: ChunkInput[],
): Promise<number> {
  if (chunks.length === 0) return 0;

  const supabase = createAdminClient();

  for (let start = 0; start < chunks.length; start += INSERT_BATCH_SIZE) {
    const rows = chunks.slice(start, start + INSERT_BATCH_SIZE).map((chunk) => ({
      document_id: documentId,
      content: chunk.content,
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      embedding: chunk.embedding,
    }));

    const { error } = await supabase.from("document_chunks").insert(rows);

    if (error) {
      throw new Error(`Insert su document_chunks fallito: ${error.message}`);
    }
  }

  return chunks.length;
}
