import { notFound } from "next/navigation";

import ChatPanel from "@/components/chat-panel";
import DocumentStatusBanner from "@/components/document-status";
import { getDocumentById } from "@/lib/repositories/documents";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Colonna sinistra: viewer PDF (react-pdf) */}
      <section className="border-r border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-500">Documento</h2>
        <p className="mt-2 text-xs text-gray-400">{document.file_name}</p>
        <div className="mt-4">
          <DocumentStatusBanner
            documentId={document.id}
            initialStatus={document.status}
            initialPageCount={document.page_count}
          />
        </div>
        {/* TODO: render del PDF con react-pdf */}
      </section>

      {/* Colonna destra: chat */}
      <section className="flex max-h-screen flex-col p-6">
        <h2 className="text-sm font-medium text-gray-500">Chat</h2>
        <div className="mt-4 min-h-0 flex-1">
          <ChatPanel
            documentId={document.id}
            isReady={document.status === "ready"}
          />
        </div>
      </section>
    </main>
  );
}
