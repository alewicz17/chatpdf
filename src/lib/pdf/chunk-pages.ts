import "server-only";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type { PdfPage } from "./load-pages";

export type PdfChunk = {
  content: string;
  pageNumber: number;
  chunkIndex: number;
};

// ~500 token: la stima usuale e' 4 caratteri per token.
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

/**
 * Divide ogni pagina in chunk da ~500 token propagando `pageNumber`.
 * `chunkIndex` e' progressivo sull'intero documento e conserva l'ordine di lettura.
 */
export async function chunkPages(pages: PdfPage[]): Promise<PdfChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const chunks: PdfChunk[] = [];

  for (const page of pages) {
    const pieces = await splitter.splitText(page.content);

    for (const piece of pieces) {
      const content = piece.trim();
      if (content.length === 0) continue;

      chunks.push({
        content,
        pageNumber: page.pageNumber,
        chunkIndex: chunks.length,
      });
    }
  }

  return chunks;
}
