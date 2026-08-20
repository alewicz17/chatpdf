import "server-only";

import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

export type PdfPage = {
  pageNumber: number;
  content: string;
};

export type LoadedPdf = {
  /** Pagine con testo estratto, in ordine di lettura. */
  pages: PdfPage[];
  /** Pagine totali del PDF, incluse quelle senza testo. */
  pageCount: number;
};

/**
 * Estrae il testo pagina per pagina mantenendo il numero di pagina.
 * Le pagine senza testo (scansioni, immagini) restano fuori dai chunk ma
 * contano nel totale.
 */
export async function loadPages(blob: Blob): Promise<LoadedPdf> {
  const loader = new WebPDFLoader(blob, { splitPages: true });
  const documents = await loader.load();

  const pages = documents
    .map((document, index) => ({
      pageNumber: Number(document.metadata?.loc?.pageNumber ?? index + 1),
      content: document.pageContent.trim(),
    }))
    .filter((page) => page.content.length > 0);

  return { pages, pageCount: documents.length };
}
