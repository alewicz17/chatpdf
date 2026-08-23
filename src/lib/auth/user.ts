import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Utente della richiesta corrente, letto dal cookie di sessione.
 * `getUser()` e non `getSession()`: il token va validato sul server di Supabase,
 * il cookie da solo non e' una prova di identita'.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
