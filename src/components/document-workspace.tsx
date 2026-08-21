"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import ChatPanel from "@/components/chat-panel";
import DocumentStatusBadge from "@/components/document-status";
import type { DocumentStatus } from "@/lib/repositories/documents";

// react-pdf tocca window e i canvas: niente prerendering sul server.
const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-sunken">
      <p className="eyebrow">Apertura del documento</p>
    </div>
  ),
});

type Pane = "documento" | "chat";

type DocumentWorkspaceProps = {
  documentId: string;
  fileName: string;
  fileUrl: string | null;
  initialStatus: DocumentStatus;
};

/** Shell della pagina documento: visore a sinistra, chat a destra, stato condiviso. */
export default function DocumentWorkspace({
  documentId,
  fileName,
  fileUrl,
  initialStatus,
}: DocumentWorkspaceProps) {
  const [status, setStatus] = useState<DocumentStatus>(initialStatus);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [activePane, setActivePane] = useState<Pane>("documento");

  const handleCitationClick = useCallback((page: number) => {
    setTargetPage(page);
    setActivePane("documento");
  }, []);

  const handleTargetReached = useCallback(() => setTargetPage(null), []);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg leading-none tracking-tight text-ink"
        >
          ChatPDF
        </Link>

        <span className="h-4 w-px shrink-0 bg-rule" aria-hidden="true" />

        <p className="min-w-0 flex-1 truncate text-sm text-ink-soft" title={fileName}>
          {fileName}
        </p>

        <DocumentStatusBadge
          documentId={documentId}
          initialStatus={initialStatus}
          onStatusChange={setStatus}
        />

        <div className="flex shrink-0 border border-rule lg:hidden">
          {(["documento", "chat"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setActivePane(pane)}
              aria-pressed={activePane === pane}
              className={`px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wide transition-colors ${
                activePane === pane
                  ? "bg-ink text-paper"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {pane}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(380px,1fr)]">
        <section
          aria-label="Documento"
          className={`min-h-0 flex-1 ${
            activePane === "documento" ? "flex" : "hidden"
          } flex-col lg:flex`}
        >
          {fileUrl ? (
            <PdfViewer
              fileUrl={fileUrl}
              targetPage={targetPage}
              onTargetReached={handleTargetReached}
            />
          ) : (
            <div className="grid h-full place-items-center bg-sunken px-6">
              <p className="max-w-xs text-center text-sm text-ink-soft">
                Il file non e&apos; piu&apos; raggiungibile su Storage. Carica di nuovo il
                PDF per rivederlo.
              </p>
            </div>
          )}
        </section>

        <section
          aria-label="Chat"
          className={`min-h-0 flex-1 border-rule ${
            activePane === "chat" ? "flex" : "hidden"
          } flex-col lg:flex lg:border-l`}
        >
          <ChatPanel
            documentId={documentId}
            isDocumentReady={status === "ready"}
            onCitationClick={handleCitationClick}
          />
        </section>
      </div>
    </div>
  );
}
