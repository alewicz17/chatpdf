import type { ChatMessage } from "@/lib/ai";
import type { MatchedChunk } from "@/lib/repositories/chunks";

/** Numero di chunk recuperati per ogni domanda. */
export const MATCH_COUNT = 6;

/** Messaggi tenuti nella richiesta al modello: la coda della conversazione. */
const MAX_HISTORY_MESSAGES = 10;

const BASE_INSTRUCTIONS = `Sei un assistente che risponde a domande su un documento PDF.
Rispondi in italiano, in modo conciso e usando solo il CONTESTO qui sotto.

Regole:
- Cita sempre la fonte di ogni affermazione nel formato [Pagina X], usando il numero di
  pagina indicato nel contesto. Se un'affermazione unisce piu' pagine, citale tutte.
- Non inventare: se il contesto non contiene la risposta, dichiara esplicitamente che il
  documento non riporta l'informazione e non aggiungere conoscenze esterne.
- Non citare pagine che non compaiono nel contesto.
- Formatta la risposta in Markdown. Le formule matematiche vanno in LaTeX tra \`$...$\`
  se inline oppure tra \`$$...$$\` se su riga propria.`;

const NO_CONTEXT_INSTRUCTIONS = `Sei un assistente che risponde a domande su un documento PDF.
Per questa domanda la ricerca non ha restituito alcun estratto del documento.
Rispondi in italiano dicendo che il documento non sembra contenere l'informazione e
invita a riformulare la domanda. Non inventare contenuti e non citare pagine.`;

/** Formatta i chunk recuperati come contesto citabile per il modello. */
export function buildContext(chunks: MatchedChunk[]): string {
  return chunks
    .map((chunk) => {
      const page = chunk.pageNumber ?? "?";
      return `[Pagina ${page}]\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/** Costruisce il system prompt con il contesto recuperato e le regole di citazione. */
export function buildSystemPrompt(chunks: MatchedChunk[]): string {
  if (chunks.length === 0) {
    return NO_CONTEXT_INSTRUCTIONS;
  }

  return `${BASE_INSTRUCTIONS}\n\nCONTESTO:\n\n${buildContext(chunks)}`;
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
