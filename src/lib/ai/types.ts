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
