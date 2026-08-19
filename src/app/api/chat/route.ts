export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/chat
 * Body: { documentId: string, messages: UIMessage[], apiKey?: string }
 *
 * TODO (pipeline RAG, step 5-6):
 * 1. Embeddare l'ultima domanda dell'utente.
 * 2. Chiamare la RPC `match_document_chunks` su Supabase per i chunk rilevanti.
 * 3. Passare il contesto al LLM (Groq / Gemini) con Vercel AI SDK e fare streaming,
 *    imponendo nel prompt la citazione della fonte nel formato [Pagina X].
 * 4. Se `apiKey` e' presente (BYOK), usarla al posto di quella di default.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.documentId) {
    return new Response(JSON.stringify({ error: "documentId e' obbligatorio" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ error: "Non ancora implementato" }),
    { status: 501, headers: { "content-type": "application/json" } },
  );
}
