"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import NavPopover from "@/components/nav-popover";
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

  const monogram = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <NavPopover
      label={t.nav.account}
      panelClassName="w-[min(16rem,calc(100vw-2rem))] p-4"
      trigger={
        <span
          className="grid h-4 w-4 shrink-0 place-items-center bg-ink text-[0.5625rem] leading-none text-paper"
          aria-hidden="true"
        >
          {monogram}
        </span>
      }
    >
      {() => (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="eyebrow">{t.nav.account}</p>
            <p className="break-all font-mono text-xs text-ink">{email}</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {t.nav.signOut}
          </button>
        </div>
      )}
    </NavPopover>
  );
}
