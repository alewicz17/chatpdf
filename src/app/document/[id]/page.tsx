import { notFound, redirect } from "next/navigation";

import DocumentWorkspace from "@/components/document-workspace";
import { getCurrentUser } from "@/lib/auth/user";
import { getDocumentById } from "@/lib/repositories/documents";
import { createSignedPdfUrl } from "@/lib/storage/pdf";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const document = await getDocumentById(id, user.id);

  if (!document) {
    notFound();
  }

  // Il bucket e' privato: il visore riceve una URL firmata a scadenza.
  const fileUrl = await createSignedPdfUrl(document.storage_path);

  return (
    <main className="flex-1">
      <DocumentWorkspace
        documentId={document.id}
        fileName={document.file_name}
        fileUrl={fileUrl}
        initialStatus={document.status}
        initialErrorMessage={document.error_message}
      />
    </main>
  );
}
