import Link from "next/link";

import DocumentStatusBadge from "@/components/document-status";
import { listDocuments } from "@/lib/repositories/documents";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Documenti dell'utente, dal piu' recente, ognuno linkato alla sua pagina. */
export default async function DocumentList({ userId }: { userId: string }) {
  const documents = await listDocuments(userId);

  if (documents.length === 0) {
    return (
      <p className="w-full max-w-xl text-center text-sm text-ink-muted">
        Nessun documento caricato per ora.
      </p>
    );
  }

  return (
    <section className="w-full max-w-xl" aria-label="Documenti caricati">
      <h2 className="eyebrow mb-3">Documenti caricati</h2>

      <ul className="border-t border-rule">
        {documents.map((document) => (
          <li key={document.id} className="border-b border-rule">
            <Link
              href={`/document/${document.id}`}
              className="flex items-center gap-3 py-3 transition-colors hover:bg-surface"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">
                  {document.file_name}
                </span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] text-ink-muted">
                  {dateFormatter.format(new Date(document.created_at))}
                </span>
              </span>

              <DocumentStatusBadge status={document.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
