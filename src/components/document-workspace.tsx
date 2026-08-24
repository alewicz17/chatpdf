"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import ChatPanel from "@/components/chat-panel";
import LocaleSwitcher from "@/components/locale-switcher";
import DocumentStatusBadge from "@/components/document-status";
import { isDocumentPending } from "@/lib/document-status";
import { format } from "@/lib/i18n/config";
import { useTranslations } from "@/lib/i18n/context";
import type { DocumentStatus } from "@/lib/repositories/documents";

// react-pdf tocca window e i canvas: niente prerendering sul server.
// Il segnaposto e' senza testo: il modulo si carica fuori dal LocaleProvider.
const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-sunken">
      <span
        className="h-4 w-4 animate-spin rounded-full border border-ink-muted border-t-transparent"
        aria-hidden="true"
      />
    </div>
  ),
});

/** Quota di ingestion esaurita (429): condizione temporanea, non un fallimento. */
class RateLimitedError extends Error {}

type Pane = "document" | "chat";

/** Progresso dell'ingestion letto dallo stato del documento. */
type DocumentStatusResponse = {
  status: DocumentStatus;
  totalChunks: number | null;
  processedChunks: number;
};

/** Esito di una singola slice restituito da `/api/process-pdf`. */
type ProcessSliceResponse = {
  done: boolean;
  processed: number;
  total: number;
};

type DocumentWorkspaceProps = {
  documentId: string;
  fileName: string;
  fileUrl: string | null;
  initialStatus: DocumentStatus;
  initialErrorMessage: string | null;
};

/** Shell della pagina documento: visore a sinistra, chat a destra, stato condiviso. */
export default function DocumentWorkspace({
  documentId,
  fileName,
  fileUrl,
  initialStatus,
  initialErrorMessage,
}: DocumentWorkspaceProps) {
  const { t } = useTranslations();
  const [status, setStatus] = useState<DocumentStatus>(() =>
    initialStatus === "pending" && !fileUrl ? "error" : initialStatus,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    initialStatus === "pending" && !fileUrl
      ? t.document.missingFile
      : initialErrorMessage,
  );
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [activePane, setActivePane] = useState<Pane>("document");

  // Evita driver concorrenti (piu' effetti / il retry) sullo stesso documento.
  const isDrivingRef = useRef(false);
  // Fermata pulita al dismount: il ciclo si interrompe dopo la slice corrente.
  const cancelledRef = useRef(false);

  /**
   * Pilota l'ingestion chiamando `/api/process-pdf` una slice per volta finche'
   * il documento non e' pronto. La route e' ripartibile: ogni chiamata riprende
   * dai chunk gia' salvati, quindi anche un retry continua da dove si era fermato.
   */
  const drive = useCallback(async () => {
    if (!fileUrl || isDrivingRef.current) return;

    isDrivingRef.current = true;
    setStatus("processing");
    setErrorMessage(null);

    try {
      while (!cancelledRef.current) {
        const response = await fetch("/api/process-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        if (cancelledRef.current) return;

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          const message = payload?.error ?? t.document.processingFailed;

          throw response.status === 429
            ? new RateLimitedError(message)
            : new Error(message);
        }

        const data = (await response.json()) as ProcessSliceResponse;
        if (cancelledRef.current) return;

        setProcessedChunks(data.processed);
        setTotalChunks(data.total);

        if (data.done) {
          setStatus("ready");
          return;
        }
      }
    } catch (error) {
      if (cancelledRef.current) return;

      console.error("Elaborazione del PDF fallita:", error);

      const message =
        error instanceof Error && error.message
          ? error.message
          : t.document.processingFailed;

      setStatus("error");
      setErrorMessage(message);

      // Il rate limit e' temporaneo: il documento non e' fallito, va solo
      // ripreso piu' tardi. Marcarlo "error" sul server lo direbbe a chiunque
      // riapra la pagina, quando invece l'ingestion e' ancora ripartibile.
      if (error instanceof RateLimitedError) return;

      // La route segna gia' l'errore quando fallisce al suo interno; qui si
      // copre il caso in cui la richiesta non e' mai arrivata al server.
      void fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "error", errorMessage: message }),
      }).catch((patchError) => {
        console.error("Salvataggio dello stato di errore fallito:", patchError);
      });
    } finally {
      isDrivingRef.current = false;
    }
  }, [documentId, fileUrl, t]);

  // Se il documento e' ancora in lavorazione, questa pagina ne pilota
  // l'ingestion. Prima legge il progresso salvato (per non mostrare la barra a
  // zero su un documento ripreso), poi avvia il ciclo delle slice.
  useEffect(() => {
    cancelledRef.current = false;

    if (fileUrl && isDocumentPending(initialStatus)) {
      void fetch(`/api/documents/${documentId}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: DocumentStatusResponse | null) => {
          if (!data || cancelledRef.current) return;
          setProcessedChunks(data.processedChunks);
          setTotalChunks(data.totalChunks);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelledRef.current) void drive();
        });
    }

    return () => {
      cancelledRef.current = true;
    };
  }, [documentId, fileUrl, initialStatus, drive]);

  const handleRetry = useCallback(() => {
    cancelledRef.current = false;
    setProcessedChunks(0);
    setTotalChunks(null);
    void drive();
  }, [drive]);

  const progressPercent =
    totalChunks && totalChunks > 0
      ? Math.min(100, Math.round((processedChunks / totalChunks) * 100))
      : null;

  const handleCitationClick = useCallback((page: number) => {
    setTargetPage(page);
    setActivePane("document");
  }, []);

  const handleTargetReached = useCallback(() => setTargetPage(null), []);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg leading-none tracking-tight text-ink"
        >
          {t.common.appName}
        </Link>

        <span className="h-4 w-px shrink-0 bg-rule" aria-hidden="true" />

        <p className="min-w-0 flex-1 truncate text-sm text-ink-soft" title={fileName}>
          {fileName}
        </p>

        <DocumentStatusBadge status={status} />

        <LocaleSwitcher />

        <div className="flex shrink-0 border border-rule lg:hidden">
          {(["document", "chat"] as const).map((pane) => (
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
              {pane === "document" ? t.document.paneDocument : t.document.paneChat}
            </button>
          ))}
        </div>
      </header>

      {isDocumentPending(status) && (
        <div className="shrink-0 border-b border-rule bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border border-current border-t-transparent"
                aria-hidden="true"
              />
              {t.document.indexing}
            </span>
            {totalChunks ? (
              <span className="font-mono text-xs text-ink-muted">
                {format(t.document.chunkProgress, {
                  processed: processedChunks,
                  total: totalChunks,
                })}
                {progressPercent !== null ? ` · ${progressPercent}%` : ""}
              </span>
            ) : null}
          </div>
          <div
            className="mt-2 h-1 w-full overflow-hidden bg-rule"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent ?? undefined}
          >
            <div
              className="h-full bg-ink transition-[width] duration-300"
              style={{ width: `${progressPercent ?? 8}%` }}
            />
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-alert bg-alert-soft px-4 py-3 sm:px-6">
          <p className="min-w-0 flex-1 text-sm leading-6 text-alert">
            {errorMessage ?? t.document.processingFailed}
          </p>

          {fileUrl && (
            <button
              type="button"
              onClick={handleRetry}
              className="shrink-0 border border-alert px-3 py-1.5 text-sm font-medium text-alert transition-colors hover:bg-alert hover:text-paper"
            >
              {t.document.retry}
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(380px,1fr)]">
        <section
          aria-label={t.document.paneDocument}
          className={`min-h-0 flex-1 ${
            activePane === "document" ? "flex" : "hidden"
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
                {t.document.missingFileViewer}
              </p>
            </div>
          )}
        </section>

        <section
          aria-label={t.document.paneChat}
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
