/**
 * Accesso centralizzato alle variabili d'ambiente.
 * Le variabili NEXT_PUBLIC_* sono leggibili anche dal client.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variabile d'ambiente mancante: ${name}. Copiala da .env.example in .env.local.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () =>
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  groqApiKey: () => required("GROQ_API_KEY", process.env.GROQ_API_KEY),
  googleApiKey: () =>
    required(
      "GOOGLE_GENERATIVE_AI_API_KEY",
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ),
  generationModel: process.env.GENERATION_MODEL ?? "llama-3.3-70b-versatile",
  pdfBucket: process.env.NEXT_PUBLIC_SUPABASE_PDF_BUCKET ?? "pdfs",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 768),
};
