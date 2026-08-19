"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

export default function PdfDropzone() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setStatus(`File selezionato: ${file.name}`);

      // TODO:
      // 1. Caricare il file su Supabase Storage (bucket `pdfs`)
      // 2. Chiamare '/api/process-pdf' con l'URL per estrarre e vettorializzare il testo
      // 3. Reindirizzare alla chat: router.push(`/document/${documentId}`)
      console.log("File accettato:", file.name);
      void router;
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-xl">
      <div
        {...getRootProps()}
        className={`w-full border-2 border-dashed p-12 text-center rounded-xl cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-lg font-medium">Rilascia il PDF qui...</p>
        ) : (
          <p className="text-lg text-gray-600">
            Trascina un PDF qui, o clicca per selezionarlo
          </p>
        )}
      </div>
      {status && <p className="mt-4 text-center text-sm text-gray-500">{status}</p>}
    </div>
  );
}
