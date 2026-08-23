import "server-only";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** Durata della signed URL passata al visore: copre una sessione di lettura. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2;

/**
 * URL temporaneo per leggere un PDF dal bucket privato.
 * Ritorna null se l'oggetto non esiste piu': la pagina lo mostra come file non
 * piu' raggiungibile invece di rompersi.
 */
export async function createSignedPdfUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(env.pdfBucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("createSignedUrl fallita:", error?.message);
    return null;
  }

  return data.signedUrl;
}
