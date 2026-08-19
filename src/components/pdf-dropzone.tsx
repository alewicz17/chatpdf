"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

/** Rende il nome del file utilizzabile come chiave di Storage. */
function toStorageFileName(fileName: string): string {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "documento.pdf";
}

export default function PdfDropzone() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);
      setStatus(`Caricamento di ${file.name} in corso...`);

      try {
        const supabase = createClient();
        const storagePath = `${crypto.randomUUID()}/${toStorageFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(env.pdfBucket)
          .upload(storagePath, file, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(env.pdfBucket).getPublicUrl(storagePath);

        setStatus("Registrazione del documento...");

        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            storagePath,
            fileUrl: publicUrl,
          }),
        });

        if (!response.ok) {
          throw new Error("Creazione del documento fallita");
        }

        const { id } = (await response.json()) as { id: string };

        // TODO: chiamare /api/process-pdf per estrarre e vettorializzare il testo.
        router.push(`/document/${id}`);
      } catch (uploadError) {
        console.error("Upload del PDF fallito:", uploadError);
        setStatus(null);
        setError("Caricamento non riuscito. Riprova.");
        setIsUploading(false);
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-xl">
      <div
        {...getRootProps()}
        className={`w-full border-2 border-dashed p-12 text-center rounded-xl transition-colors ${
          isUploading
            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
            : isDragActive
              ? "cursor-pointer border-blue-500 bg-blue-50 text-blue-700"
              : "cursor-pointer border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p className="text-lg font-medium">Caricamento in corso...</p>
        ) : isDragActive ? (
          <p className="text-lg font-medium">Rilascia il PDF qui...</p>
        ) : (
          <p className="text-lg text-gray-600">
            Trascina un PDF qui, o clicca per selezionarlo
          </p>
        )}
      </div>
      {status && !error && (
        <p className="mt-4 text-center text-sm text-gray-500">{status}</p>
      )}
      {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
