import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmbeddingProvider, getTextGenerator } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/user";
import {
  MATCH_COUNT,
  buildSystemPrompt,
  lastUserQuestion,
  toChatMessages,
} from "@/lib/chat/prompt";
import { matchDocumentChunks } from "@/lib/repositories/chunks";
import { getDocumentById } from "@/lib/repositories/documents";

// Il service role e gli adapter dei provider girano su runtime Node, non Edge.
export const runtime = "nodejs";
export const maxDuration = 30;

const uiMessagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(uiMessagePartSchema),
});

const chatSchema = z.object({
  documentId: z.string().uuid(),
  messages: z.array(uiMessageSchema).min(1),
  /** Chiave del provider di generazione fornita dall'utente (BYOK). */
  apiKey: z.string().min(1).optional(),
});

/**
 * POST /api/chat
 * Vettorializza la domanda, recupera i chunk piu' simili del documento e genera
 * la risposta in streaming, imponendo la citazione della fonte come [Pagina X].
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { documentId, apiKey } = parsed.data;
  const messages = toChatMessages(parsed.data.messages);
  const question = lastUserQuestion(messages);

  if (!question) {
    return NextResponse.json(
      { error: "Nessuna domanda dell'utente nei messaggi" },
      { status: 400 },
    );
  }

  try {
    const document = await getDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json(
        { error: "Documento non trovato" },
        { status: 404 },
      );
    }

    if (document.status !== "ready") {
      return NextResponse.json(
        { error: "Il documento non e' ancora pronto" },
        { status: 409 },
      );
    }

    // Gli embedding restano sulla chiave di default: quella dell'utente e' del
    // provider di generazione e non sarebbe valida per il provider di embedding.
    const queryEmbedding = await getEmbeddingProvider().embedQuery(question);
    const chunks = await matchDocumentChunks(
      documentId,
      user.id,
      queryEmbedding,
      MATCH_COUNT,
    );

    return getTextGenerator(apiKey).streamAnswer({
      system: buildSystemPrompt(chunks),
      messages,
    });
  } catch (error) {
    console.error("POST /api/chat", error);

    return NextResponse.json(
      { error: "Generazione della risposta fallita" },
      { status: 500 },
    );
  }
}
