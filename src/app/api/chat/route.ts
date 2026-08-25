import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmbeddingProvider, getTextGenerator } from "@/lib/ai";
import { classifyProviderError, providerErrorMessage } from "@/lib/ai/errors";
import { getCurrentUser } from "@/lib/auth/user";
import { getTranslations } from "@/lib/i18n/server";
import {
  MATCH_COUNT,
  buildSystemPrompt,
  lastUserQuestion,
  toChatMessages,
} from "@/lib/chat/prompt";
import {
  RATE_LIMITS,
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
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
  const { locale, t } = await getTranslations();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Prima di tutto il resto: embedding e generazione si pagano a chiamata.
  const rateLimit = await consumeRateLimit(user.id, RATE_LIMITS.chat);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, t);
  }

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: t.api.invalidPayload, issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { documentId, apiKey } = parsed.data;
  const messages = toChatMessages(parsed.data.messages);
  const question = lastUserQuestion(messages);

  if (!question) {
    return NextResponse.json(
      { error: t.api.noQuestion },
      { status: 400 },
    );
  }

  try {
    const document = await getDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json(
        { error: t.api.documentNotFound },
        { status: 404 },
      );
    }

    if (document.status !== "ready") {
      return NextResponse.json(
        { error: t.api.documentNotReady },
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
      system: buildSystemPrompt(chunks, locale),
      messages,
      t,
    });
  } catch (error) {
    console.error("POST /api/chat", error);

    // Quota o limite del provider: va detto esplicitamente, altrimenti sembra
    // che sia l'app a non funzionare.
    const providerError = classifyProviderError(error);

    if (providerError) {
      return NextResponse.json(
        { error: providerErrorMessage(providerError, t) },
        { status: providerError === "auth" ? 401 : 429 },
      );
    }

    return NextResponse.json(
      { error: t.api.generationFailed },
      { status: 500 },
    );
  }
}
