// Il worker di pdfjs non ha tipi: viene caricato solo per popolare
// `globalThis.pdfjsWorker`, il suo contenuto non si usa mai direttamente.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
