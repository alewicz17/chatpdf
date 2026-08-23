import "server-only";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Scarica il PDF dallo Storage e lo restituisce come Blob per WebPDFLoader.
 * Il bucket e' privato: si passa dal service role, non da un URL pubblico.
 */
export async function fetchPdf(storagePath: string): Promise<Blob> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(env.pdfBucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Download del PDF fallito: ${error?.message ?? "file non trovato"}`,
    );
  }

  return data;
}
