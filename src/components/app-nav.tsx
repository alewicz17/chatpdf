"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import ApiKeyMenu from "@/components/api-key-menu";
import LocaleSwitcher from "@/components/locale-switcher";
import UserMenu from "@/components/user-menu";
import { useTranslations } from "@/lib/i18n/context";

type AppNavProps = {
  email: string;
  /** Contenuto specifico della pagina, tra il wordmark e i controlli. */
  children?: ReactNode;
  /** Controlli della pagina, dopo il gruppo comune. */
  trailing?: ReactNode;
};

/** Testata condivisa: wordmark, contesto della pagina, lingua, chiave API, account. */
export default function AppNav({ email, children, trailing }: AppNavProps) {
  const { t } = useTranslations();

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-rule bg-surface/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="masthead-mark shrink-0 font-serif text-lg leading-none tracking-tight text-ink"
        >
          {t.common.appName}
        </Link>

        {children}

        <div className="ml-auto flex shrink-0 items-center divide-x divide-rule border border-rule">
          <LocaleSwitcher />
          <ApiKeyMenu />
          <UserMenu email={email} />
        </div>

        {trailing}
      </div>
    </header>
  );
}
