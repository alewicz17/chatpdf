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

/** Quanti chunk sono gia' salvati: l'ingestion progressiva riparte da qui. */
export async function countChunksByDocument(documentId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (error) {
    throw new Error(`Count su document_chunks fallito: ${error.message}`);
  }

  return count ?? 0;
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

    // `ignoreDuplicates` sul vincolo (document_id, chunk_index): un blocco gia'
    // salvato da un tentativo precedente non viene riscritto ne' duplicato.
    const { error } = await supabase
      .from("document_chunks")
      .upsert(rows, {
        onConflict: "document_id,chunk_index",
        ignoreDuplicates: true,
      });

    if (error) {
      throw new Error(`Insert su document_chunks fallito: ${error.message}`);
    }
  }

  return chunks.length;
}

export type MatchedChunk = {
  id: number;
  content: string;
  pageNumber: number | null;
  similarity: number;
};

type MatchDocumentChunksRow = {
  id: number;
  content: string;
  page_number: number | null;
  similarity: number;
};

/**
 * Similarity search sui chunk di un documento (RPC `match_document_chunks`).
 * L'utente e' un parametro della RPC: il service role bypassa la RLS, il
 * controllo sul proprietario lo fa la funzione SQL.
 */
export async function matchDocumentChunks(
  documentId: string,
  userId: string,
  queryEmbedding: number[],
  matchCount: number,
): Promise<MatchedChunk[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_document_id: documentId,
    match_user_id: userId,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`RPC match_document_chunks fallita: ${error.message}`);
  }

  return ((data ?? []) as MatchDocumentChunksRow[]).map((row) => ({
    id: row.id,
    content: row.content,
    pageNumber: row.page_number,
    similarity: row.similarity,
  }));
}
