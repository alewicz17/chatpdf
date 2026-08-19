import { NextResponse } from "next/server";

// LangChain (WebPDFLoader + splitter) gira su runtime Node, non Edge.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/process-pdf
 * Body: { documentId: string, fileUrl: string }
 *
 * TODO (pipeline RAG, step 2-4):
 * 1. Scaricare il PDF da `fileUrl` e caricarlo con WebPDFLoader
 *    (`@langchain/community/document_loaders/web/pdf`) mantenendo `page_number`.
 * 2. Chunking con RecursiveCharacterTextSplitter (~500 token).
 * 3. Generare gli embedding e salvare i chunk in `document_chunks`
 *    tramite `createAdminClient()` da "@/lib/supabase/admin".
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.documentId || !body?.fileUrl) {
    return NextResponse.json(
      { error: "documentId e fileUrl sono obbligatori" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, documentId: body.documentId, chunks: 0 });
}
