import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmbeddingProvider } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/user";
import { GENERIC_PROCESSING_ERROR } from "@/lib/document-status";
import { chunkPages } from "@/lib/pdf/chunk-pages";
import { embedChunks } from "@/lib/pdf/embed-chunks";
import { fetchPdf } from "@/lib/pdf/fetch-pdf";
import { loadPages, PdfWithoutTextError } from "@/lib/pdf/load-pages";
import {
  countChunksByDocument,
  deleteChunksByDocument,
  insertChunks,
} from "@/lib/repositories/chunks";
import {
  getDocumentById,
  updateDocumentStatus,
} from "@/lib/repositories/documents";

// LangChain (WebPDFLoader + splitter) gira su runtime Node, non Edge.
export const runtime = "nodejs";
export const maxDuration = 60;

// Quanti chunk vettorializzare e salvare a ogni invocazione: tiene la singola
// chiamata sotto `maxDuration`. Il client richiama la route finche' non riceve
// `done`, cosi' anche un PDF lungo si indicizza senza andare in timeout.
const CHUNKS_PER_INVOCATION = 128;

const PDF_WITHOUT_TEXT_MESSAGE =
  "Questo PDF non contiene testo selezionabile: sembra una scansione. " +
  "Serve una versione con OCR per poterci chattare sopra.";

const processPdfSchema = z.object({
  documentId: z.string().uuid(),
  apiKey: z.string().min(1).optional(),
});

/** Traduce l'errore tecnico nel messaggio mostrato all'utente. */
function userFacingMessage(error: unknown): string {
  if (error instanceof PdfWithoutTextError) {
    return PDF_WITHOUT_TEXT_MESSAGE;
  }
  return GENERIC_PROCESSING_ERROR;
}

/**
 * POST /api/process-pdf
 * Indicizza una slice del PDF: ricostruisce i chunk (operazione deterministica),
 * riprende dal numero di chunk gia' salvati e vettorializza solo il blocco
 * successivo. Il client richiama la route finche' la risposta non ha `done`,
 * cosi' l'ingestion e' spezzata su piu' invocazioni ed e' ripartibile.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = processPdfSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { documentId, apiKey } = parsed.data;

  // Il percorso su Storage viene dal database, non dal client: e' anche il
  // controllo di proprieta' del documento.
  const document = await getDocumentById(documentId, user.id);

  if (!document) {
    return NextResponse.json(
      { error: "Documento non trovato" },
      { status: 404 },
    );
  }

  try {
    // Il PDF e' immutabile: ricostruire i chunk a ogni invocazione da' sempre
    // la stessa lista nello stesso ordine, quindi il numero di chunk gia'
    // salvati e' l'offset esatto da cui riprendere.
    const blob = await fetchPdf(document.storage_path);
    const { pages, pageCount } = await loadPages(blob);
    const chunks = await chunkPages(pages);
    const totalChunks = chunks.length;

    const alreadySaved = await countChunksByDocument(documentId);

    if (alreadySaved === 0) {
      // Primo passaggio: azzera un eventuale tentativo parziale, fissa il
      // totale e ripulisce l'errore precedente cosi' il retry riparte pulito.
      await deleteChunksByDocument(documentId);
      await updateDocumentStatus(documentId, {
        status: "processing",
        totalChunks,
        errorMessage: null,
      });
    } else if (alreadySaved < totalChunks) {
      await updateDocumentStatus(documentId, { status: "processing" });
    }

    const slice = chunks.slice(
      alreadySaved,
      alreadySaved + CHUNKS_PER_INVOCATION,
    );

    if (slice.length > 0) {
      const embedded = await embedChunks(slice, getEmbeddingProvider(apiKey));
      await insertChunks(documentId, embedded);
    }

    const processed = alreadySaved + slice.length;
    const done = processed >= totalChunks;

    if (done) {
      await updateDocumentStatus(documentId, { status: "ready", pageCount });
    }

    return NextResponse.json({
      ok: true,
      documentId,
      done,
      processed,
      total: totalChunks,
      pages: pageCount,
    });
  } catch (error) {
    console.error("POST /api/process-pdf", error);

    const message = userFacingMessage(error);

    // Lo stato di errore e' quello che la UI mostra: non deve mascherare l'originale.
    await updateDocumentStatus(documentId, {
      status: "error",
      errorMessage: message,
    }).catch((statusError) => {
      console.error("POST /api/process-pdf (status error)", statusError);
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
