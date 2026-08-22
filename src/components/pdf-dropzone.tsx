"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Rende il nome del file utilizzabile come chiave di Storage. */
function toStorageFileName(fileName: string): string {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "documento.pdf";
}

/** Traduce il motivo di scarto di react-dropzone nel messaggio mostrato. */
function rejectionMessage(rejections: FileRejection[]): string {
  if (rejections.length > 1) {
    return "Carica un solo PDF alla volta.";
  }

  const codes = rejections[0]?.errors.map((error) => error.code) ?? [];

  if (codes.includes("file-too-large")) {
    return `Il file supera ${MAX_FILE_SIZE_MB} MB. Carica un PDF piu' leggero.`;
  }
  if (codes.includes("file-invalid-type")) {
    return "Sono ammessi solo file PDF.";
  }
  if (codes.includes("too-many-files")) {
    return "Carica un solo PDF alla volta.";
  }

  return "File non valido. Carica un PDF di massimo " + MAX_FILE_SIZE_MB + " MB.";
}

export default function PdfDropzone() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setStatus(null);
    setError(rejectionMessage(rejections));
  }, []);

  const onDropAccepted = useCallback(
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

        // L'ingestion la pilota la pagina del documento, una slice per volta:
        // li' se ne vede l'avanzamento e la si puo' riprovare se fallisce.
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
    onDropAccepted,
    onDropRejected,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
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
        aria-busy={isUploading}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p className="inline-flex items-center gap-2 text-base">
            <span
              className="h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-t-transparent"
              aria-hidden="true"
            />
            Caricamento in corso
          </p>
        ) : isDragActive ? (
          <p className="text-base font-medium">Rilascia il PDF qui</p>
        ) : (
          <>
            <p className="text-base">
              Trascina un PDF qui, o clicca per selezionarlo
            </p>
            <p className="eyebrow mt-2">
              Solo PDF, massimo {MAX_FILE_SIZE_MB} MB
            </p>
          </>
        )}
      </div>
      {status && !error && (
        <p className="eyebrow mt-4 text-center" role="status" aria-live="polite">
          {status}
        </p>
      )}
      {error && (
        <p className="mt-4 text-center text-sm text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
