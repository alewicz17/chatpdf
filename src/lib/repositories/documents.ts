import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DocumentStatus = "pending" | "processing" | "ready" | "error";

export type DocumentRow = {
  id: string;
  created_at: string;
  file_name: string;
  storage_path: string;
  file_url: string | null;
  page_count: number | null;
  status: DocumentStatus;
};

export type CreateDocumentInput = {
  fileName: string;
  storagePath: string;
  fileUrl: string;
};

/** Inserisce il documento appena caricato su Storage e ritorna la riga creata. */
export async function createDocument(
  input: CreateDocumentInput,
): Promise<DocumentRow> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      file_name: input.fileName,
      storage_path: input.storagePath,
      file_url: input.fileUrl,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Insert su documents fallito: ${error.message}`);
  }

  return data as DocumentRow;
}

export type UpdateDocumentStatusInput = {
  status: DocumentStatus;
  pageCount?: number;
};

/** Aggiorna lo stato di avanzamento dell'ingestion (e il numero di pagine estratte). */
export async function updateDocumentStatus(
  documentId: string,
  input: UpdateDocumentStatusInput,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("documents")
    .update({
      status: input.status,
      ...(input.pageCount === undefined ? {} : { page_count: input.pageCount }),
    })
    .eq("id", documentId);

  if (error) {
    throw new Error(`Update su documents fallito: ${error.message}`);
  }
}

/** Legge un singolo documento; ritorna null se l'id non esiste. */
export async function getDocumentById(
  documentId: string,
): Promise<DocumentRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .select()
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Select su documents fallito: ${error.message}`);
  }

  return (data as DocumentRow | null) ?? null;
}
