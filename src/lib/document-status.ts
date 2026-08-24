import type { DocumentStatus } from "@/lib/repositories/documents";

/** Stili dello stato: condivisi tra la lista e la pagina documento. */
export const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  pending: "border-rule text-ink-muted",
  processing: "border-rule text-ink-soft",
  ready: "border-marker bg-marker-soft text-ink",
  error: "border-alert bg-alert-soft text-alert",
};

/** Vero finche' l'ingestion non e' conclusa (in un senso o nell'altro). */
export function isDocumentPending(status: DocumentStatus): boolean {
  return status === "pending" || status === "processing";
}
