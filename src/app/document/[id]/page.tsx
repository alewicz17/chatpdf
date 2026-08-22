import { notFound } from "next/navigation";

import DocumentWorkspace from "@/components/document-workspace";
import { getDocumentById } from "@/lib/repositories/documents";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  return (
    <main className="flex-1">
      <DocumentWorkspace
        documentId={document.id}
        fileName={document.file_name}
        fileUrl={document.file_url}
        initialStatus={document.status}
        initialErrorMessage={document.error_message}
      />
    </main>
  );
}
