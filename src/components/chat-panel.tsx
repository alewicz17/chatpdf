"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import MarkdownMessage from "@/components/markdown-message";
import { useApiKey } from "@/lib/api-key";
import { useTranslations } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const MAX_TEXTAREA_HEIGHT = 168;

type ChatPanelProps = {
  documentId: string;
  /** La chat si abilita solo quando l'ingestion e' conclusa. */
  isDocumentReady: boolean;
  /** Chiamato quando l'utente clicca una citazione: porta il visore su quella pagina. */
  onCitationClick: (page: number) => void;
};

/** Estrae il testo di un messaggio dalle sue parti. */
function messageText(parts: UIMessage["parts"]): string {
  return parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function storageKey(documentId: string): string {
  return `chatpdf:conversation:${documentId}`;
}

/** Rilegge la conversazione salvata, scartandola se non ha la forma attesa. */
function readStoredMessages(documentId: string): UIMessage[] {
  try {
    const raw = window.localStorage.getItem(storageKey(documentId));
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (message): message is UIMessage =>
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        Array.isArray((message as UIMessage).parts),
    );
  } catch (error) {
    console.error("Lettura della conversazione salvata fallita:", error);
    return [];
  }
}

/**
 * Messaggio da mostrare per un errore della chat.
 * Quando la route risponde con uno stato di errore (429, 409, 401...) il corpo
 * JSON arriva qui come testo grezzo: si estrae il campo `error` invece di
 * stampare l'oggetto serializzato.
 */
function readErrorMessage(error: Error, t: Dictionary): string {
  const raw = error.message.trim();
  if (!raw) return t.chat.failed;

  if (raw.startsWith("{")) {
    try {
      const payload = JSON.parse(raw) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      // Non era JSON: vale il messaggio cosi' com'e'.
    }
  }

  return raw;
}

/** Chat sul documento: domande dell'utente, risposte in streaming con citazioni. */
export default function ChatPanel({
  documentId,
  isDocumentReady,
  onCitationClick,
}: ChatPanelProps) {
  const { t } = useTranslations();
  const [input, setInput] = useState("");
  const apiKey = useApiKey();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: apiKey ? { documentId, apiKey } : { documentId },
      }),
    [documentId, apiKey],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    status,
    error,
    clearError,
    stop,
  } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  // La conversazione si rilegge dopo il mount: il server non conosce localStorage.
  useEffect(() => {
    hasRestoredRef.current = false;
    const stored = readStoredMessages(documentId);

    if (stored.length > 0) setMessages(stored);
    hasRestoredRef.current = true;
  }, [documentId, setMessages]);

  useEffect(() => {
    if (!hasRestoredRef.current || isBusy) return;

    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(storageKey(documentId));
      } else {
        window.localStorage.setItem(
          storageKey(documentId),
          JSON.stringify(messages),
        );
      }
    } catch (storageError) {
      console.error("Salvataggio della conversazione fallito:", storageError);
    }
  }, [messages, isBusy, documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [input]);

  const submitQuestion = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isBusy || !isDocumentReady) return;

      setInput("");
      clearError();
      void sendMessage({ text: trimmed });
    },
    [isBusy, isDocumentReady, sendMessage, clearError],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(input);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    clearError();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex shrink-0 items-center justify-between border-b border-rule px-5 py-3">
        <span className="eyebrow">{t.chat.heading}</span>

        {messages.length > 0 && !isBusy && (
          <button
            type="button"
            onClick={clearConversation}
            className="font-mono text-[0.6875rem] uppercase tracking-wide text-ink-muted transition-colors hover:text-ink"
          >
            {t.chat.clear}
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="font-serif text-[0.9375rem] leading-7 text-ink-soft">
              {isDocumentReady
                ? t.chat.emptyReady
                : t.chat.emptyWaiting}
            </p>

            {isDocumentReady && (
              <div className="flex flex-col items-start gap-2">
                {t.chat.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submitQuestion(suggestion)}
                    className="border border-rule px-3 py-1.5 text-left text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap bg-ink px-4 py-2.5 text-sm leading-6 text-paper">
                {messageText(message.parts)}
              </p>
            </div>
          ) : (
            <div key={message.id} className="border-l-2 border-marker pl-4">
              <MarkdownMessage
                content={messageText(message.parts)}
                onCitationClick={onCitationClick}
              />
            </div>
          ),
        )}

        {status === "submitted" && (
          <div
            className="flex items-center gap-1.5 border-l-2 border-marker pl-4"
            aria-live="polite"
          >
            <span className="sr-only">{t.chat.searching}</span>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="thinking-dot h-1.5 w-1.5 rounded-full bg-ink-muted"
                style={{ animationDelay: `${index * 150}ms` }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="border border-alert bg-alert-soft px-4 py-3">
            <p className="text-sm text-alert">
              {readErrorMessage(error, t)}
            </p>
            <button
              type="button"
              onClick={() => {
                clearError();
                void regenerate();
              }}
              className="mt-2 font-mono text-[0.6875rem] uppercase tracking-wide text-alert underline underline-offset-2"
            >
              {t.chat.retry}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion(input);
        }}
        className="shrink-0 border-t border-rule p-4"
      >
        <div className="flex items-end gap-2 border border-rule bg-sunken px-3 py-2 focus-within:border-ink">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!isDocumentReady}
            placeholder={
              isDocumentReady
                ? t.chat.placeholderReady
                : t.chat.placeholderWaiting
            }
            className="max-h-42 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
          />

          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="shrink-0 bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(21,23,29,0.12)]"
            >
              {t.chat.stop}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isDocumentReady || input.trim().length === 0}
              className="shrink-0 bg-ink px-3 py-1.5 text-sm font-medium text-paper transition-colors disabled:bg-rule-strong disabled:text-surface"
            >
              {t.chat.send}
            </button>
          )}
        </div>

        <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-wide text-ink-muted">
          {t.chat.inputHint}
        </p>
      </form>
    </div>
  );
}
