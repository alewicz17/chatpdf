"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { DocumentStatus } from "@/lib/repositories/documents";

const POLL_INTERVAL_MS = 2000;

type DocumentStatusResponse = {
  status: DocumentStatus;
  pageCount: number | null;
};

const LABELS: Record<DocumentStatus, string> = {
  pending: "In coda per l'elaborazione...",
  processing: "Elaborazione in corso: estrazione del testo e vettorializzazione...",
  ready: "Documento pronto",
  error: "Elaborazione non riuscita. Riprova a caricare il PDF.",
};

const STYLES: Record<DocumentStatus, string> = {
  pending: "border-gray-200 bg-gray-50 text-gray-600",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  ready: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

function isPending(status: DocumentStatus): boolean {
  return status === "pending" || status === "processing";
}

type DocumentStatusBannerProps = {
  documentId: string;
  initialStatus: DocumentStatus;
  initialPageCount: number | null;
};

/** Mostra lo stato dell'ingestion, in polling finche' non e' concluso. */
export default function DocumentStatusBanner({
  documentId,
  initialStatus,
  initialPageCount,
}: DocumentStatusBannerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus>(initialStatus);
  const [pageCount, setPageCount] = useState<number | null>(initialPageCount);

  useEffect(() => {
    if (!isPending(status)) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as DocumentStatusResponse;
        if (cancelled) return;

        setStatus(data.status);
        setPageCount(data.pageCount);

        // Lo stato finale cambia cio' che i Server Component possono mostrare.
        if (!isPending(data.status)) {
          router.refresh();
        }
      } catch (error) {
        console.error("Polling dello stato del documento fallito:", error);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [documentId, status, router]);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${STYLES[status]}`}
      role="status"
      aria-live="polite"
    >
      {isPending(status) && (
        <span
          className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span>
        {LABELS[status]}
        {status === "ready" && pageCount !== null && ` — ${pageCount} pagine`}
      </span>
    </div>
  );
}
