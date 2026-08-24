"use client";

import { useState } from "react";

import NavPopover from "@/components/nav-popover";
import { useApiKey, writeApiKey } from "@/lib/api-key";
import { useTranslations } from "@/lib/i18n/context";

/**
 * Chiave API personale (BYOK) dalla testata.
 * La chiave non viene mai rimostrata dopo il salvataggio: il campo torna vuoto e il
 * pannello segnala soltanto quale chiave e' in uso.
 */
export default function ApiKeyMenu() {
  const { t } = useTranslations();
  const apiKey = useApiKey();
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: React.FormEvent, close: () => void) => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (trimmed.length === 0) return;

    writeApiKey(trimmed);
    setDraft("");
    close();
  };

  const handleRemove = () => {
    writeApiKey(null);
    setDraft("");
  };

  return (
    <NavPopover
      label={t.apiKey.label}
      panelClassName="w-[min(20rem,calc(100vw-2rem))] p-4"
      trigger={
        <>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              apiKey ? "bg-marker ring-1 ring-rule-strong" : "bg-rule-strong"
            }`}
            aria-hidden="true"
          />
          <span>{t.nav.apiKey}</span>
        </>
      }
    >
      {(close) => (
        <form onSubmit={(event) => handleSubmit(event, close)} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="api-key" className="eyebrow">
              {t.apiKey.label}
            </label>

            <span className="font-mono text-[0.625rem] uppercase tracking-wide text-ink-soft">
              {apiKey ? t.nav.apiKeyOwn : t.nav.apiKeyDefault}
            </span>
          </div>

          <input
            id="api-key"
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              apiKey ? t.apiKey.placeholderReplace : t.apiKey.placeholderNew
            }
            className="w-full border border-rule bg-sunken px-3 py-1.5 font-mono text-xs text-ink outline-none focus:border-ink placeholder:font-sans placeholder:text-ink-muted"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="flex-1 bg-ink px-3 py-1.5 text-sm font-medium text-paper transition-colors disabled:bg-rule-strong disabled:text-surface"
            >
              {t.apiKey.save}
            </button>

            {apiKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="shrink-0 border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                {t.apiKey.remove}
              </button>
            )}
          </div>

          <p className="text-xs leading-5 text-ink-muted">{t.apiKey.help}</p>
        </form>
      )}
    </NavPopover>
  );
}
