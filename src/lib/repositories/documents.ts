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
