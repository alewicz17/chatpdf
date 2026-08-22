import type { DocumentStatus } from "@/lib/repositories/documents";

/** Etichette e stili dello stato: condivisi tra la lista e la pagina documento. */
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "In coda",
  processing: "Indicizzazione",
  ready: "Pronto",
  error: "Non riuscita",
};

export const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  pending: "border-rule text-ink-muted",
  processing: "border-rule text-ink-soft",
  ready: "border-marker bg-marker-soft text-ink",
  error: "border-alert bg-alert-soft text-alert",
};

/** Messaggio di fallback quando il server non ne ha salvato uno piu' specifico. */
export const GENERIC_PROCESSING_ERROR =
  "Elaborazione del PDF non riuscita. Riprova.";

/** Vero finche' l'ingestion non e' conclusa (in un senso o nell'altro). */
export function isDocumentPending(status: DocumentStatus): boolean {
  return status === "pending" || status === "processing";
}
