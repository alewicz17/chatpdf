/**
 * Interfacce dei provider AI. Fuori da `src/lib/ai/` nessun file importa l'SDK di un
 * provider ne' nomina un modello: si conoscono solo queste interfacce.
 */

export interface EmbeddingProvider {
  /** Identificativo del modello, utile per log e diagnostica. */
  readonly model: string;
  /** Dimensioni del vettore prodotto: deve restare allineato alla colonna `vector(n)`. */
  readonly dimensions: number;
  /** Vettorializza i chunk di un documento (task di indicizzazione). */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /** Vettorializza una domanda dell'utente (task di ricerca). */
  embedQuery(text: string): Promise<number[]>;
}

/** Messaggio della conversazione, gia' ridotto a testo semplice. */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamAnswerInput = {
  /** Istruzioni di sistema: contesto recuperato e regole di citazione. */
  system: string;
  messages: ChatMessage[];
};

export interface TextGenerator {
  /** Identificativo del modello, utile per log e diagnostica. */
  readonly model: string;
  /**
   * Genera la risposta in streaming e ritorna la `Response` da inoltrare al client
   * nel protocollo atteso da `useChat`.
   */
  streamAnswer(input: StreamAnswerInput): Response;
}
