"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  LOCALES,
  persistLocale,
  type Locale,
} from "@/lib/i18n/config";
import { useTranslations } from "@/lib/i18n/context";

const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
};

/** Bandiera del Regno Unito; `clipId` evita collisioni tra piu' istanze. */
function EnglishFlag({ clipId }: { clipId: string }) {
  return (
    <svg viewBox="0 0 60 30" className="h-3.5 w-5" aria-hidden="true">
      <clipPath id={clipId}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath={`url(#${clipId})`}
        stroke="#c8102e"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}

function ItalianFlag() {
  return (
    <svg viewBox="0 0 60 30" className="h-3.5 w-5" aria-hidden="true">
      <rect width="20" height="30" fill="#008c45" />
      <rect x="20" width="20" height="30" fill="#f4f5f0" />
      <rect x="40" width="20" height="30" fill="#cd212a" />
    </svg>
  );
}

/** Selettore della lingua: scrive il cookie e ricarica i Server Component. */
export default function LocaleSwitcher() {
  const router = useRouter();
  const { locale, t } = useTranslations();
  const clipId = useId();
  const [isPending, startTransition] = useTransition();

  function selectLocale(next: Locale) {
    if (next === locale) return;

    persistLocale(next);

    // Le stringhe vivono nei Server Component: serve un nuovo render dal server.
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="flex shrink-0 border border-rule"
      role="group"
      aria-label={t.nav.language}
    >
      {LOCALES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => selectLocale(value)}
          disabled={isPending}
          aria-pressed={locale === value}
          title={LOCALE_NAMES[value]}
          className={`px-2 py-1.5 transition-opacity disabled:opacity-50 ${
            locale === value ? "bg-sunken opacity-100" : "opacity-40 hover:opacity-80"
          }`}
        >
          {value === "en" ? <EnglishFlag clipId={clipId} /> : <ItalianFlag />}
          <span className="sr-only">{LOCALE_NAMES[value]}</span>
        </button>
      ))}
    </div>
  );
}
