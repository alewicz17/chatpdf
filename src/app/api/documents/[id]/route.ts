import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getDocumentById } from "@/lib/repositories/documents";

// Il repository usa il service role: runtime Node, non Edge.
export const runtime = "nodejs";

/**
 * GET /api/documents/[id]
 * Stato di avanzamento dell'ingestion, usato dalla UI in polling.
 */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await ctx.params;

  try {
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        { error: "Documento non trovato" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: document.id,
      fileName: document.file_name,
      status: document.status,
      pageCount: document.page_count,
    });
  } catch (error) {
    console.error("GET /api/documents/[id]", error);
    return NextResponse.json(
      { error: "Impossibile leggere il documento" },
      { status: 500 },
    );
  }
}
