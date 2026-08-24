import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/user";
import { getTranslations } from "@/lib/i18n/server";
import { countChunksByDocument } from "@/lib/repositories/chunks";
import {
  getDocumentById,
  updateDocumentStatus,
} from "@/lib/repositories/documents";

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
  const { t } = await getTranslations();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const document = await getDocumentById(id, user.id);

    if (!document) {
      return NextResponse.json(
        { error: t.api.documentNotFound },
        { status: 404 },
      );
    }

    // Il conteggio serve solo mentre l'ingestion e' in corso: a documento
    // pronto i chunk salvati coincidono col totale.
    const processedChunks =
      document.status === "processing" || document.status === "pending"
        ? await countChunksByDocument(document.id)
        : (document.total_chunks ?? 0);

    return NextResponse.json({
      id: document.id,
      fileName: document.file_name,
      status: document.status,
      pageCount: document.page_count,
      errorMessage: document.error_message,
      totalChunks: document.total_chunks,
      processedChunks,
    });
  } catch (error) {
    console.error("GET /api/documents/[id]", error);
    return NextResponse.json(
      { error: t.api.readDocumentFailed },
      { status: 500 },
    );
  }
}

// Il client puo' segnare solo il fallimento: gli altri stati li scrive l'ingestion.
const markErrorSchema = z.object({
  status: z.literal("error"),
  errorMessage: z.string().min(1).max(500).optional(),
});

/**
 * PATCH /api/documents/[id]
 * Marca il documento come non riuscito quando la chiamata a `/api/process-pdf`
 * non arriva nemmeno al server (rete caduta, richiesta interrotta): senza
 * questo il documento resterebbe "in coda" per sempre.
 */
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { t } = await getTranslations();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = markErrorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: t.api.invalidPayload, issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const document = await getDocumentById(id, user.id);

    if (!document) {
      return NextResponse.json(
        { error: t.api.documentNotFound },
        { status: 404 },
      );
    }

    // Un'ingestion andata a buon fine nel frattempo non va sovrascritta.
    if (document.status === "ready") {
      return NextResponse.json({ status: document.status });
    }

    await updateDocumentStatus(id, {
      status: "error",
      errorMessage: parsed.data.errorMessage ?? null,
    });

    return NextResponse.json({ status: "error" });
  } catch (error) {
    console.error("PATCH /api/documents/[id]", error);
    return NextResponse.json(
      { error: t.api.updateDocumentFailed },
      { status: 500 },
    );
  }
}
