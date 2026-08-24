"use client";

import { useTranslations } from "@/lib/i18n/context";
import type { DocumentStatus } from "@/lib/repositories/documents";
import {
  DOCUMENT_STATUS_STYLES,
  isDocumentPending,
} from "@/lib/document-status";

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

/** Stato dell'ingestion in forma compatta, con spinner finche' e' in corso. */
export default function DocumentStatusBadge({
  status,
}: DocumentStatusBadgeProps) {
  const { t } = useTranslations();

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 border px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wide ${DOCUMENT_STATUS_STYLES[status]}`}
      role="status"
      aria-live="polite"
    >
      {isDocumentPending(status) && (
        <span
          className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {t.status[status]}
    </span>
  );
}
