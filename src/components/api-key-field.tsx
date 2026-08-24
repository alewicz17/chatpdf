"use client";

import { useState } from "react";

import { useTranslations } from "@/lib/i18n/context";

type ApiKeyFieldProps = {
  /** Chiave attualmente in uso, `null` se si usa quella di default del server. */
  apiKey: string | null;
  /** Salva la nuova chiave oppure la rimuove passando `null`. */
  onChange: (apiKey: string | null) => void;
};

/**
 * Campo per la chiave API personale dell'utente (BYOK).
 * La chiave non viene mai rimostrata dopo il salvataggio: il campo torna vuoto e il
 * pannello segnala soltanto che una chiave e' attiva.
 */
export default function ApiKeyField({ apiKey, onChange }: ApiKeyFieldProps) {
  const { t } = useTranslations();
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (trimmed.length === 0) return;

    onChange(trimmed);
    setDraft("");
  };

  const handleRemove = () => {
    onChange(null);
    setDraft("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 space-y-2 border-b border-rule bg-sunken px-5 py-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="api-key" className="eyebrow">
          {t.apiKey.label}
        </label>

        {apiKey && (
          <span className="font-mono text-[0.625rem] uppercase tracking-wide text-ink-soft">
            {t.apiKey.active}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
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
          className="min-w-0 flex-1 border border-rule bg-surface px-3 py-1.5 font-mono text-xs text-ink outline-none focus:border-ink placeholder:font-sans placeholder:text-ink-muted"
        />

        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="shrink-0 bg-ink px-3 py-1.5 text-sm font-medium text-paper transition-colors disabled:bg-rule-strong disabled:text-surface"
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

      <p className="text-xs leading-5 text-ink-muted">
        {t.apiKey.help}
      </p>
    </form>
  );
}
