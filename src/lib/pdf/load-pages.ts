import "server-only";

import { preparePdfjsRuntime } from "./pdfjs-runtime";

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

/** Il PDF non contiene testo estraibile: tipicamente una scansione senza OCR. */
export class PdfWithoutTextError extends Error {
  constructor() {
    super("Nessun testo estratto dal PDF");
    this.name = "PdfWithoutTextError";
  }
}

/**
 * Estrae il testo pagina per pagina mantenendo il numero di pagina.
 * Le pagine senza testo (scansioni, immagini) restano fuori dai chunk ma
 * contano nel totale; se nessuna pagina ha testo l'ingestion non ha senso e
 * viene interrotta con `PdfWithoutTextError`.
 *
 * `pdf-parse` si usa direttamente e non tramite il loader di LangChain: quello
 * risolve il parser con un import dinamico che il file tracing di Vercel non
 * vede, quindi il modulo non finisce nel bundle della lambda e l'estrazione
 * fallisce solo in produzione.
 *
 * L'import e' dinamico perche' i global di pdfjs vanno installati prima che il
 * modulo venga valutato (vedi `preparePdfjsRuntime`).
 */
export async function loadPages(blob: Blob): Promise<LoadedPdf> {
  await preparePdfjsRuntime();

  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({
    data: new Uint8Array(await blob.arrayBuffer()),
  });

  try {
    const result = await parser.getText();

    const pages = result.pages
      .map((page) => ({
        pageNumber: page.num,
        content: page.text.trim(),
      }))
      .filter((page) => page.content.length > 0);

    if (pages.length === 0) {
      throw new PdfWithoutTextError();
    }

    return { pages, pageCount: result.total };
  } finally {
    // Chiude il documento pdfjs: l'errore di cleanup non deve sostituire quello
    // originale, che e' l'unica diagnosi che arriva nei log.
    await parser.destroy().catch((error: unknown) => {
      console.error("loadPages (destroy)", error);
    });
  }
}
