"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type NavPopoverProps = {
  /** Etichetta accessibile del bottone che apre il pannello. */
  label: string;
  /** Contenuto del bottone. */
  trigger: ReactNode;
  /** Contenuto del pannello; `close` lo chiude dopo un'azione. */
  children: (close: () => void) => ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
};

/** Menu a tendina della testata: chiusura con Esc, click fuori e dopo un'azione. */
export default function NavPopover({
  label,
  trigger,
  children,
  triggerClassName = "",
  panelClassName = "",
}: NavPopoverProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wide transition-colors ${
          isOpen ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink"
        } ${triggerClassName}`}
      >
        {trigger}
        <svg
          viewBox="0 0 10 6"
          className={`h-1.5 w-2 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="square"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          id={panelId}
          className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 border border-rule bg-surface shadow-[0_12px_32px_-12px_rgba(21,23,29,0.35)] ${panelClassName}`}
        >
          {children(() => setIsOpen(false))}
        </div>
      )}
    </div>
  );
}
