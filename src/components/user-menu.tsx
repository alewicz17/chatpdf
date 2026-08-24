"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useTranslations } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

/** Email dell'utente collegato e uscita dalla sessione. */
export default function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const { t } = useTranslations();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[12rem] truncate font-mono text-[0.6875rem] text-ink-muted">
        {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="shrink-0 border border-rule px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wide text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        {t.nav.signOut}
      </button>
    </div>
  );
}
