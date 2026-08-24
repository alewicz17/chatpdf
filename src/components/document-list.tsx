import Link from "next/link";

import DocumentStatusBadge from "@/components/document-status";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { getTranslations } from "@/lib/i18n/server";
import { listDocuments } from "@/lib/repositories/documents";

/** Documenti dell'utente, dal piu' recente, ognuno linkato alla sua pagina. */
export default async function DocumentList({ userId }: { userId: string }) {
  const documents = await listDocuments(userId);
  const { locale, t } = await getTranslations();

  const dateFormatter = new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (documents.length === 0) {
    return (
      <p className="w-full max-w-xl text-center text-sm text-ink-muted">
        {t.home.documentsEmpty}
      </p>
    );
  }

  return (
    <section className="w-full max-w-xl" aria-label={t.home.documentsHeading}>
      <h2 className="eyebrow mb-3">{t.home.documentsHeading}</h2>

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
