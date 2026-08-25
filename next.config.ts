import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist va lasciato fuori dal bundle del server: il suo worker viene
  // caricato come modulo a se' (vedi src/lib/pdf/pdfjs-runtime.ts) e il
  // bundler, impacchettandolo, non emetterebbe il file corrispondente.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
