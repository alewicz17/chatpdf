"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";

import { format } from "@/lib/i18n/config";
import { useTranslations } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionaries";
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

  return normalized.length > 0 ? normalized : "document.pdf";
}

/** Traduce il motivo di scarto di react-dropzone nel messaggio mostrato. */
function rejectionMessage(
  rejections: FileRejection[],
  t: Dictionary,
): string {
  if (rejections.length > 1) {
    return t.dropzone.oneFileOnly;
  }

  const codes = rejections[0]?.errors.map((error) => error.code) ?? [];

  if (codes.includes("file-too-large")) {
    return format(t.dropzone.tooLarge, { size: MAX_FILE_SIZE_MB });
  }
  if (codes.includes("file-invalid-type")) {
    return t.dropzone.invalidType;
  }
  if (codes.includes("too-many-files")) {
    return t.dropzone.oneFileOnly;
  }

  return format(t.dropzone.invalidFile, { size: MAX_FILE_SIZE_MB });
}

export default function PdfDropzone() {
  const router = useRouter();
  const { t } = useTranslations();
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setStatus(null);
    setError(rejectionMessage(rejections, t));
  }, [t]);

  const onDropAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);
      setStatus(format(t.dropzone.uploadingFile, { name: file.name }));

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(t.dropzone.sessionExpired);
        }

        // Il primo segmento del path e' l'id dell'utente: e' su questo che le
        // policy dello Storage riconoscono il proprietario del file.
        const storagePath = `${user.id}/${crypto.randomUUID()}/${toStorageFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(env.pdfBucket)
          .upload(storagePath, file, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        setStatus(t.dropzone.registering);

        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            storagePath,
          }),
        });

        if (!response.ok) {
          throw new Error(t.dropzone.createFailed);
        }

        const { id } = (await response.json()) as { id: string };

        // L'ingestion la pilota la pagina del documento, una slice per volta:
        // li' se ne vede l'avanzamento e la si puo' riprovare se fallisce.
        router.push(`/document/${id}`);
      } catch (uploadError) {
        console.error("Upload del PDF fallito:", uploadError);
        setStatus(null);
        setError(t.dropzone.uploadFailed);
        setIsUploading(false);
      }
    },
    [router, t],
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
            {t.dropzone.uploading}
          </p>
        ) : isDragActive ? (
          <p className="text-base font-medium">{t.dropzone.dragActive}</p>
        ) : (
          <>
            <p className="text-base">{t.dropzone.idle}</p>
            <p className="eyebrow mt-2">
              {format(t.dropzone.hint, { size: MAX_FILE_SIZE_MB })}
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
