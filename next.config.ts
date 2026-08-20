import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse carica il worker di pdfjs-dist con un import dinamico a runtime:
  // se il bundler li impacchetta, il file del worker non viene emesso e
  // l'estrazione fallisce con "Setting up fake worker failed".
  serverExternalPackages: ["@langchain/community", "pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
