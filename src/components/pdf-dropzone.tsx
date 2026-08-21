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

        setStatus("Avvio dell'elaborazione...");

        // Ingestion in background: la pagina del documento ne mostra l'avanzamento.
        void fetch("/api/process-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: id, fileUrl: publicUrl }),
        }).catch((processError) => {
          console.error("Avvio di process-pdf fallito:", processError);
        });

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
        className={`w-full border border-dashed bg-surface p-12 text-center transition-colors ${
          isUploading
            ? "cursor-not-allowed border-rule text-ink-muted"
            : isDragActive
              ? "cursor-pointer border-marker bg-marker-soft text-ink"
              : "cursor-pointer border-rule-strong text-ink-soft hover:border-ink"
        }`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p className="text-base">Caricamento in corso</p>
        ) : isDragActive ? (
          <p className="text-base font-medium">Rilascia il PDF qui</p>
        ) : (
          <p className="text-base">
            Trascina un PDF qui, o clicca per selezionarlo
          </p>
        )}
      </div>
      {status && !error && (
        <p className="eyebrow mt-4 text-center">{status}</p>
      )}
      {error && (
        <p className="mt-4 text-center text-sm text-alert">{error}</p>
      )}
    </div>
  );
}
