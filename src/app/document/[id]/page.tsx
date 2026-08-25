import { notFound, redirect } from "next/navigation";
import { z } from "zod";

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

  // L'id finisce in una query su una colonna uuid: un valore malformato farebbe
  // fallire Postgres e uscire un 500 al posto della pagina "non trovato".
  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

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
        userEmail={user.email ?? ""}
        fileName={document.file_name}
        fileUrl={fileUrl}
        initialStatus={document.status}
        initialErrorMessage={document.error_message}
      />
    </main>
  );
}
