"use client";

import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";

/**
 * I modelli emettono spesso le formule con i delimitatori LaTeX `\(...\)` e `\[...\]`,
 * che remark-math non riconosce: li normalizza in `$...$` e `$$...$$`.
 */
function normalizeMathDelimiters(segment: string): string {
  return segment
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula: string) => `$$${formula}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula: string) => `$${formula}$`);
}

/** `[Pagina 3, 5]` -> link interni, resi poi come chip che pilotano il visore. */
const CITATION_PATTERN = /\[\s*Pagina\s+(\d+(?:\s*(?:,|\se\s)\s*\d+)*)\s*\]/gi;

function linkifyCitations(segment: string): string {
  return segment.replace(CITATION_PATTERN, (_, pages: string) =>
    pages
      .split(/\s*(?:,|\se\s)\s*/)
      .map((page) => `[Pagina ${page}](#pagina-${page})`)
      .join(" "),
  );
}

/** Applica le trasformazioni al solo testo, lasciando intatti i blocchi di codice. */
function prepareContent(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : linkifyCitations(normalizeMathDelimiters(segment)),
    )
    .join("");
}

type MarkdownMessageProps = {
  content: string;
  /** Riceve il numero di pagina quando l'utente clicca una citazione. */
  onCitationClick?: (page: number) => void;
};

/** Render della risposta: markdown, formule KaTeX e citazioni cliccabili. */
export default function MarkdownMessage({
  content,
  onCitationClick,
}: MarkdownMessageProps) {
  const prepared = useMemo(() => prepareContent(content), [content]);

  const components = useMemo<Components>(
    () => ({
      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
      ul: ({ children }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
      ),
      h1: ({ children }) => (
        <h1 className="mb-2 text-base font-semibold">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-2 text-base font-semibold">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-2 text-sm font-semibold">{children}</h3>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-ink">{children}</strong>
      ),
      a: ({ children, href }) => {
        const citation =
          typeof href === "string" ? /^#pagina-(\d+)$/.exec(href) : null;

        if (citation) {
          const page = Number(citation[1]);

          return (
            <button
              type="button"
              onClick={() => onCitationClick?.(page)}
              disabled={!onCitationClick}
              title={`Vai a pagina ${page}`}
              className="mx-0.5 inline-flex items-baseline border-b-2 border-marker bg-marker-soft px-1 font-mono text-[0.6875rem] uppercase tracking-wide text-ink transition-colors hover:bg-marker disabled:cursor-default disabled:hover:bg-marker-soft"
            >
              {children}
            </button>
          );
        }

        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-quill underline underline-offset-2"
          >
            {children}
          </a>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="mb-3 border-l-2 border-rule-strong pl-3 text-ink-soft last:mb-0">
          {children}
        </blockquote>
      ),
      code: ({ className, children }) => {
        const isBlock =
          typeof className === "string" && className.includes("language-");

        if (isBlock) {
          return (
            <code className="block overflow-x-auto bg-ink p-3 font-mono text-xs text-paper">
              {children}
            </code>
          );
        }

        return (
          <code className="bg-sunken px-1 py-0.5 font-mono text-xs text-ink-soft">
            {children}
          </code>
        );
      },
      pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
      table: ({ children }) => (
        <div className="mb-3 overflow-x-auto last:mb-0">
          <table className="w-full border-collapse text-xs">{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th className="border border-rule px-2 py-1 text-left font-semibold">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border border-rule px-2 py-1">{children}</td>
      ),
    }),
    [onCitationClick],
  );

  return (
    <div className="font-serif text-[0.9375rem] leading-7 text-ink-soft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={components}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
