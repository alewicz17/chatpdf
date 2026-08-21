"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import MarkdownMessage from "@/components/markdown-message";

type ChatPanelProps = {
  documentId: string;
  /** La chat si abilita solo quando l'ingestion e' conclusa. */
  isReady: boolean;
};

/** Estrae il testo di un messaggio dalle sue parti. */
function messageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("");
}

/** Chat sul documento: domande all'utente, risposte in streaming con citazioni. */
export default function ChatPanel({ documentId, isReady }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { documentId },
      }),
    [documentId],
  );

  const { messages, sendMessage, status, error, stop } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = input.trim();
    if (!question || isBusy || !isReady) return;

    setInput("");
    void sendMessage({ text: question });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">
            {isReady
              ? "Fai una domanda sul documento: le risposte citano la pagina di origine."
              : "La chat si attiva quando l'elaborazione del PDF e' conclusa."}
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                message.role === "user"
                  ? "whitespace-pre-wrap bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {message.role === "user" ? (
                messageText(message.parts)
              ) : (
                <MarkdownMessage content={messageText(message.parts)} />
              )}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <p className="text-sm text-gray-400">Sto cercando nel documento...</p>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Errore nella risposta. Riprova.
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 pt-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Fai una domanda sul documento..."
          disabled={!isReady}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        {isBusy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Ferma
          </button>
        ) : (
          <button
            type="submit"
            disabled={!isReady || input.trim().length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
          >
            Invia
          </button>
        )}
      </form>
    </div>
  );
}
