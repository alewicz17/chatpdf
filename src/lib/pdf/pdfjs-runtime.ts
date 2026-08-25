import "server-only";

/**
 * `pdfjs-dist` (dietro `pdf-parse`) da' per scontato un ambiente browser e in
 * Node si appoggia a due cose che sulla lambda di Vercel non ci sono:
 *
 * 1. `@napi-rs/canvas`, dipendenza opzionale nativa da cui prende `DOMMatrix`.
 *    La classe serve gia' alla valutazione del modulo (`new DOMMatrix()` a
 *    livello top), quindi senza il pacchetto l'import di `pdf-parse` esplode
 *    con "ReferenceError: DOMMatrix is not defined".
 * 2. `pdf.worker.mjs`, che pdfjs carica con un `import()` costruito a runtime.
 *    Il file tracing di Vercel non vede quel percorso, il worker non finisce
 *    nel bundle e il parsing muore con "Setting up fake worker failed".
 *
 * Entrambi si risolvono prima di toccare `pdf-parse`, ed entrambi falliscono
 * solo in produzione: in locale `@napi-rs/canvas` e' installato e il worker si
 * risolve dal filesystem.
 */

/**
 * Matrice 2D minimale al posto di quella di `@napi-rs/canvas`.
 * Qui si estrae solo testo, mai si renderizza su canvas: basta lo stato della
 * matrice per far passare la valutazione del modulo di pdfjs.
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

type PdfjsGlobals = {
  DOMMatrix?: unknown;
  pdfjsWorker?: unknown;
};

/**
 * Prepara i global di cui pdfjs ha bisogno e va chiamata **prima** di importare
 * `pdf-parse`: gli errori avvengono durante la valutazione dei moduli, quindi
 * un import statico sarebbe gia' troppo tardi.
 */
export async function preparePdfjsRuntime(): Promise<void> {
  // Il tipo del DOM ha una superficie che all'estrazione del testo non serve:
  // qui conta solo che il global esista quando pdfjs viene valutato.
  const globals = globalThis as unknown as PdfjsGlobals;

  globals.DOMMatrix ??= TextOnlyDOMMatrix;

  if (globals.pdfjsWorker) {
    return;
  }

  // Il worker si importa qui, con un percorso letterale che il file tracing
  // riesce a seguire: se `globalThis.pdfjsWorker` e' gia' popolato pdfjs usa
  // quello e non prova a caricare il file da solo.
  globals.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
}
