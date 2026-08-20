import "server-only";

/** Scarica il PDF dallo Storage e lo restituisce come Blob per WebPDFLoader. */
export async function fetchPdf(fileUrl: string): Promise<Blob> {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(
      `Download del PDF fallito (${response.status} ${response.statusText})`,
    );
  }

  return response.blob();
}
