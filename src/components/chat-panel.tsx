"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import ApiKeyField from "@/components/api-key-field";
import MarkdownMessage from "@/components/markdown-message";

const MAX_TEXTAREA_HEIGHT = 168;

/** La chiave personale vale per tutti i documenti, non solo per quello aperto. */
const API_KEY_STORAGE_KEY = "chatpdf:generation-api-key";

const SUGGESTIONS = [
  "Riassumi il documento in cinque punti",
  "Qual e' la conclusione?",
  "Elenca date e scadenze citate",
];

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
 * La chiave personale vive in localStorage: e' uno store esterno a React, letto con
 * `useSyncExternalStore` cosi' resta allineata anche tra piu' schede aperte.
 */
const apiKeyListeners = new Set<() => void>();

function subscribeToApiKey(onStoreChange: () => void): () => void {
  apiKeyListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    apiKeyListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getApiKeySnapshot(): string | null {
  try {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error("Lettura della chiave API salvata fallita:", error);
    return null;
  }
}

/** Sul server non esiste localStorage: si parte sempre dalla chiave di default. */
function getApiKeyServerSnapshot(): string | null {
  return null;
}

function writeApiKey(apiKey: string | null): void {
  try {
    if (apiKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Salvataggio della chiave API fallito:", error);
  }

  // L'evento `storage` non arriva alla scheda che scrive: si notifica a mano.
  apiKeyListeners.forEach((listener) => listener());
}

/** Chat sul documento: domande dell'utente, risposte in streaming con citazioni. */
export default function ChatPanel({
  documentId,
  isDocumentReady,
  onCitationClick,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isApiKeyPanelOpen, setIsApiKeyPanelOpen] = useState(false);
  const apiKey = useSyncExternalStore(
    subscribeToApiKey,
    getApiKeySnapshot,
    getApiKeyServerSnapshot,
  );
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
        <span className="eyebrow">Conversazione</span>

        <div className="flex items-center gap-4">
          {messages.length > 0 && !isBusy && (
            <button
              type="button"
              onClick={clearConversation}
              className="font-mono text-[0.6875rem] uppercase tracking-wide text-ink-muted transition-colors hover:text-ink"
            >
              Svuota
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsApiKeyPanelOpen((open) => !open)}
            aria-expanded={isApiKeyPanelOpen}
            aria-controls="api-key-panel"
            className={`font-mono text-[0.6875rem] uppercase tracking-wide transition-colors hover:text-ink ${
              apiKey ? "text-ink" : "text-ink-muted"
            }`}
          >
            Chiave API{apiKey ? " •" : ""}
          </button>
        </div>
      </header>

      {isApiKeyPanelOpen && (
        <div id="api-key-panel">
          <ApiKeyField apiKey={apiKey} onChange={writeApiKey} />
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="font-serif text-[0.9375rem] leading-7 text-ink-soft">
              {isDocumentReady
                ? "Fai una domanda sul documento. Ogni risposta cita la pagina da cui viene: cliccala per aprirla."
                : "La chat si apre appena il documento e' stato indicizzato."}
            </p>

            {isDocumentReady && (
              <div className="flex flex-col items-start gap-2">
                {SUGGESTIONS.map((suggestion) => (
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
            <span className="sr-only">Ricerca nel documento in corso</span>
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
              {error.message.trim() || "La risposta si e' interrotta prima di arrivare."}
            </p>
            <button
              type="button"
              onClick={() => {
                clearError();
                void regenerate();
              }}
              className="mt-2 font-mono text-[0.6875rem] uppercase tracking-wide text-alert underline underline-offset-2"
            >
              Riprova
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
                ? "Fai una domanda sul documento"
                : "In attesa dell'indicizzazione"
            }
            className="max-h-42 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
          />

          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="shrink-0 bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(21,23,29,0.12)]"
            >
              Ferma
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isDocumentReady || input.trim().length === 0}
              className="shrink-0 bg-ink px-3 py-1.5 text-sm font-medium text-paper transition-colors disabled:bg-rule-strong disabled:text-surface"
            >
              Invia
            </button>
          )}
        </div>

        <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-wide text-ink-muted">
          Invio per inviare, Maiusc+Invio per andare a capo
        </p>
      </form>
    </div>
  );
}
