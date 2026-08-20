import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmbeddingProvider } from "@/lib/ai";
import { chunkPages } from "@/lib/pdf/chunk-pages";
import { embedChunks } from "@/lib/pdf/embed-chunks";
import { fetchPdf } from "@/lib/pdf/fetch-pdf";
import { loadPages } from "@/lib/pdf/load-pages";
import {
  deleteChunksByDocument,
  insertChunks,
} from "@/lib/repositories/chunks";
import { updateDocumentStatus } from "@/lib/repositories/documents";

// LangChain (WebPDFLoader + splitter) gira su runtime Node, non Edge.
export const runtime = "nodejs";
export const maxDuration = 60;

const processPdfSchema = z.object({
  documentId: z.string().uuid(),
  fileUrl: z.string().url(),
  apiKey: z.string().min(1).optional(),
});

/**
 * POST /api/process-pdf
 * Scarica il PDF, lo divide in chunk con il numero di pagina, li vettorializza
 * e li salva in `document_chunks`.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = processPdfSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { documentId, fileUrl, apiKey } = parsed.data;

  try {
    await updateDocumentStatus(documentId, { status: "processing" });

    const blob = await fetchPdf(fileUrl);
    const { pages, pageCount } = await loadPages(blob);

    if (pages.length === 0) {
      throw new Error("Nessun testo estratto dal PDF");
    }

    const chunks = await chunkPages(pages);
    const embedded = await embedChunks(chunks, getEmbeddingProvider(apiKey));

    await deleteChunksByDocument(documentId);
    const savedChunks = await insertChunks(documentId, embedded);

    await updateDocumentStatus(documentId, {
      status: "ready",
      pageCount,
    });

    return NextResponse.json({
      ok: true,
      documentId,
      pages: pageCount,
      chunks: savedChunks,
    });
  } catch (error) {
    console.error("POST /api/process-pdf", error);

    // Lo stato di errore e' quello che la UI mostra: non deve mascherare l'originale.
    await updateDocumentStatus(documentId, { status: "error" }).catch(
      (statusError) => {
        console.error("POST /api/process-pdf (status error)", statusError);
      },
    );

    return NextResponse.json(
      { error: "Elaborazione del PDF fallita" },
      { status: 500 },
    );
  }
}
