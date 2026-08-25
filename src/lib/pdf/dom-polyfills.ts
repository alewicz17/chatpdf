import "server-only";

/**
 * `pdfjs-dist` (dietro `pdf-parse`) valuta `new DOMMatrix()` a livello di modulo
 * e in Node prova a prendere la classe da `@napi-rs/canvas`, una sua
 * dipendenza opzionale nativa. Su Vercel quel pacchetto non finisce nel bundle
 * della lambda, quindi l'import stesso di `pdf-parse` esplode con
 * "ReferenceError: DOMMatrix is not defined" e l'ingestion fallisce solo in
 * produzione.
 *
 * Serve solo l'estrazione del testo, mai il rendering su canvas: basta una
 * classe con lo stato di una matrice 2D per far passare la valutazione del
 * modulo. Se il runtime espone gia' un `DOMMatrix` vero, quello vince.
 */
class TextOnlyDOMMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  readonly is2D = true;

  constructor(init?: number[] | string) {
    const values =
      typeof init === "string"
        ? init.split(",").map((value) => Number(value.trim()))
        : init;
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = values ?? [];

    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  get m11() {
    return this.a;
  }
  get m12() {
    return this.b;
  }
  get m21() {
    return this.c;
  }
  get m22() {
    return this.d;
  }
  get m41() {
    return this.e;
  }
  get m42() {
    return this.f;
  }

  get isIdentity() {
    return (
      this.a === 1 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 1 &&
      this.e === 0 &&
      this.f === 0
    );
  }
}

/**
 * Va chiamata prima di importare `pdf-parse`: l'errore avviene durante la
 * valutazione del modulo, quindi un import statico sarebbe gia' troppo tardi.
 */
export function ensurePdfDomGlobals(): void {
  // Il tipo del DOM ha una superficie che allo stripping del testo non serve:
  // qui conta solo che il global esista prima della valutazione di pdfjs.
  const globals = globalThis as unknown as { DOMMatrix?: unknown };

  globals.DOMMatrix ??= TextOnlyDOMMatrix;
}
