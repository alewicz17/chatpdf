"use client";

import { useEffect, useState } from "react";

import type { DocumentStatus } from "@/lib/repositories/documents";

const POLL_INTERVAL_MS = 2000;

type DocumentStatusResponse = {
  status: DocumentStatus;
  pageCount: number | null;
};

const LABELS: Record<DocumentStatus, string> = {
  pending: "In coda",
  processing: "Indicizzazione",
  ready: "Pronto",
  error: "Non riuscita",
};

const STYLES: Record<DocumentStatus, string> = {
  pending: "border-rule text-ink-muted",
  processing: "border-rule text-ink-soft",
  ready: "border-marker bg-marker-soft text-ink",
  error: "border-alert bg-alert-soft text-alert",
};

function isPending(status: DocumentStatus): boolean {
  return status === "pending" || status === "processing";
}

type DocumentStatusBadgeProps = {
  documentId: string;
  initialStatus: DocumentStatus;
  /** Notifica lo stato al workspace, che ne ricava se la chat e' utilizzabile. */
  onStatusChange: (status: DocumentStatus) => void;
};

/** Stato dell'ingestion in forma compatta, in polling finche' non e' concluso. */
export default function DocumentStatusBadge({
  documentId,
  initialStatus,
  onStatusChange,
}: DocumentStatusBadgeProps) {
  const [status, setStatus] = useState<DocumentStatus>(initialStatus);

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
        onStatusChange(data.status);
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
  }, [documentId, status, onStatusChange]);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 border px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wide ${STYLES[status]}`}
      role="status"
      aria-live="polite"
    >
      {isPending(status) && (
        <span
          className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {LABELS[status]}
    </span>
  );
}
