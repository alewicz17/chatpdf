"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Il worker va configurato nello stesso modulo che usa <Document>, altrimenti
// l'ordine di esecuzione dei moduli rimette il valore di default.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.25, 1.5, 1.75, 2];
const DEFAULT_ZOOM_INDEX = 3;

/** Pagine montate attorno a quella corrente: le altre restano segnaposto. */
const RENDER_WINDOW = 2;

/** Rapporto altezza/larghezza dei segnaposto finche' non si conosce quello reale. */
const FALLBACK_ASPECT_RATIO = 1.414;

const FLASH_DURATION_MS = 1400;

type PdfViewerProps = {
  fileUrl: string;
  /** Pagina richiesta da una citazione della chat; azzerata una volta raggiunta. */
  targetPage: number | null;
  onTargetReached: () => void;
};

/** Visore continuo del PDF: scroll verticale, zoom e salto alla pagina citata. */
export default function PdfViewer({
  fileUrl,
  targetPage,
  onTargetReached,
}: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const visibilityRef = useRef(new Map<number, number>());

  const [pageCount, setPageCount] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(FALLBACK_ASPECT_RATIO);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasLoadError, setHasLoadError] = useState(false);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const pageWidth = Math.max(280, Math.round((containerWidth - 64) * zoom));

  // react-pdf ricarica il documento se l'oggetto options cambia identita'.
  const documentOptions = useMemo(() => ({}), []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setContainerWidth(width);
    });

    observer.observe(container);
    setContainerWidth(container.clientWidth);

    return () => observer.disconnect();
  }, []);

  const handleDocumentLoad = useCallback(async (pdf: PDFDocumentProxy) => {
    setHasLoadError(false);
    setPageCount(pdf.numPages);

    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      setAspectRatio(viewport.height / viewport.width);
    } catch (error) {
      console.error("Lettura del formato della prima pagina fallita:", error);
    }
  }, []);

  // Pagina corrente: quella che occupa piu' spazio nella finestra di scroll.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || pageCount === 0) return;

    const visibility = visibilityRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const page = Number(
            (entry.target as HTMLElement).dataset.pageNumber ?? "0",
          );
          if (page > 0) visibility.set(page, entry.intersectionRatio);
        }

        let best = 0;
        let bestRatio = 0;

        for (const [page, ratio] of visibility) {
          if (ratio > bestRatio) {
            best = page;
            bestRatio = ratio;
          }
        }

        if (best > 0) setCurrentPage(best);
      },
      { root: container, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    for (const element of pageRefs.current.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [pageCount]);

  // Salto alla pagina citata, con un anello giallo che la segnala all'arrivo.
  useEffect(() => {
    if (targetPage === null || pageCount === 0) return;

    const clamped = Math.min(Math.max(targetPage, 1), pageCount);
    const element = pageRefs.current.get(clamped);

    onTargetReached();

    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    element.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    element.classList.add("page-flash");

    const timeout = window.setTimeout(() => {
      element.classList.remove("page-flash");
    }, FLASH_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [targetPage, pageCount, onTargetReached]);

  const registerPage = useCallback(
    (page: number) => (element: HTMLDivElement | null) => {
      if (element) {
        pageRefs.current.set(page, element);
      } else {
        pageRefs.current.delete(page);
        visibilityRef.current.delete(page);
      }
    },
    [],
  );

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-sunken px-4 py-6 sm:px-8"
      >
        <Document
          file={fileUrl}
          options={documentOptions}
          onLoadSuccess={handleDocumentLoad}
          onLoadError={(error) => {
            console.error("Caricamento del PDF fallito:", error);
            setHasLoadError(true);
          }}
          loading={
            <p className="eyebrow py-16 text-center">Apertura del documento</p>
          }
          error={
            <p className="mx-auto max-w-sm border border-rule bg-surface p-6 text-center text-sm text-ink-soft">
              Il PDF non si apre. Ricarica la pagina o carica di nuovo il file.
            </p>
          }
          noData={null}
          className="mx-auto flex w-full flex-col items-center gap-6"
        >
          {!hasLoadError &&
            pages.map((page) => {
              const isRendered = Math.abs(page - currentPage) <= RENDER_WINDOW;
              const placeholderHeight = Math.round(pageWidth * aspectRatio);

              return (
                <div
                  key={page}
                  ref={registerPage(page)}
                  data-page-number={page}
                  className="scroll-mt-6 bg-surface shadow-[0_1px_3px_rgba(21,23,29,0.16)]"
                  style={{
                    width: pageWidth,
                    minHeight: isRendered ? undefined : placeholderHeight,
                  }}
                >
                  {isRendered ? (
                    <Page
                      pageNumber={page}
                      width={pageWidth}
                      loading={<div style={{ height: placeholderHeight }} />}
                    />
                  ) : (
                    <div className="flex items-start justify-center pt-8">
                      <span className="eyebrow tabular-nums">{page}</span>
                    </div>
                  )}
                </div>
              );
            })}
        </Document>
      </div>

      {pageCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-rule bg-surface/95 px-2 py-1.5 shadow-[0_2px_10px_rgba(21,23,29,0.12)] backdrop-blur">
            <button
              type="button"
              onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
              disabled={zoomIndex === 0}
              aria-label="Riduci lo zoom"
              className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sunken disabled:text-rule-strong disabled:hover:bg-transparent"
            >
              &minus;
            </button>
            <span className="eyebrow w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setZoomIndex((index) =>
                  Math.min(ZOOM_LEVELS.length - 1, index + 1),
                )
              }
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              aria-label="Aumenta lo zoom"
              className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sunken disabled:text-rule-strong disabled:hover:bg-transparent"
            >
              +
            </button>

            <span className="mx-1 h-4 w-px bg-rule" aria-hidden="true" />

            <span className="eyebrow pr-2 tabular-nums" aria-live="polite">
              Pagina {currentPage} di {pageCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
