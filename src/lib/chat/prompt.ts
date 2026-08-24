import type { ChatMessage } from "@/lib/ai";
import { CITATION_LABELS } from "@/lib/chat/citation";
import type { Locale } from "@/lib/i18n/config";
import type { MatchedChunk } from "@/lib/repositories/chunks";

/** Numero di chunk recuperati per ogni domanda. */
export const MATCH_COUNT = 6;

/** Messaggi tenuti nella richiesta al modello: la coda della conversazione. */
const MAX_HISTORY_MESSAGES = 10;

/**
 * Istruzioni per lingua: il modello deve rispondere nella lingua scelta
 * nell'interfaccia e citare con l'etichetta che la chat sa riconoscere.
 */
const INSTRUCTIONS: Record<
  Locale,
  { base: string; noContext: string; contextHeading: string }
> = {
  en: {
    base: `You are an assistant answering questions about a PDF document.
Answer in English, concisely, using only the CONTEXT below.

Rules:
- Always cite the source of every statement in the format [Page X], using the page
  number given in the context. If a statement spans several pages, cite them all.
- Do not make things up: if the context does not contain the answer, say explicitly
  that the document does not report the information and add no outside knowledge.
- Never cite pages that do not appear in the context.
- Format the answer in Markdown. Maths goes in LaTeX between \`$...$\` when inline
  or between \`$$...$$\` on its own line.`,
    noContext: `You are an assistant answering questions about a PDF document.
For this question the search returned no extract from the document.
Answer in English, saying the document does not seem to contain the information and
inviting the user to rephrase the question. Invent nothing and cite no pages.`,
    contextHeading: "CONTEXT",
  },
  it: {
    base: `Sei un assistente che risponde a domande su un documento PDF.
Rispondi in italiano, in modo conciso e usando solo il CONTESTO qui sotto.

Regole:
- Cita sempre la fonte di ogni affermazione nel formato [Pagina X], usando il numero di
  pagina indicato nel contesto. Se un'affermazione unisce piu' pagine, citale tutte.
- Non inventare: se il contesto non contiene la risposta, dichiara esplicitamente che il
  documento non riporta l'informazione e non aggiungere conoscenze esterne.
- Non citare pagine che non compaiono nel contesto.
- Formatta la risposta in Markdown. Le formule matematiche vanno in LaTeX tra \`$...$\`
  se inline oppure tra \`$$...$$\` se su riga propria.`,
    noContext: `Sei un assistente che risponde a domande su un documento PDF.
Per questa domanda la ricerca non ha restituito alcun estratto del documento.
Rispondi in italiano dicendo che il documento non sembra contenere l'informazione e
invita a riformulare la domanda. Non inventare contenuti e non citare pagine.`,
    contextHeading: "CONTESTO",
  },
};

/** Formatta i chunk recuperati come contesto citabile per il modello. */
export function buildContext(chunks: MatchedChunk[], locale: Locale): string {
  const label = CITATION_LABELS[locale];

  return chunks
    .map((chunk) => {
      const page = chunk.pageNumber ?? "?";
      return `[${label} ${page}]\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/** Costruisce il system prompt con il contesto recuperato e le regole di citazione. */
export function buildSystemPrompt(
  chunks: MatchedChunk[],
  locale: Locale,
): string {
  const instructions = INSTRUCTIONS[locale];

  if (chunks.length === 0) {
    return instructions.noContext;
  }

  return `${instructions.base}\n\n${instructions.contextHeading}:\n\n${buildContext(chunks, locale)}`;
}

type UIMessageLike = {
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; text?: string }>;
};

/** Riduce i messaggi di `useChat` a testo semplice, scartando le parti non testuali. */
export function toChatMessages(messages: UIMessageLike[]): ChatMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as ChatMessage["role"],
      content: message.parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text as string)
        .join("\n")
        .trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

/** Ultima domanda dell'utente: e' quella da vettorializzare. */
export function lastUserQuestion(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return messages[index].content;
    }
  }

  return null;
}
