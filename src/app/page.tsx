import PdfDropzone from "@/components/pdf-dropzone";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">ChatPDF</h1>
        <p className="mt-2 text-gray-500">
          Carica un PDF e fai domande sul suo contenuto.
        </p>
      </div>
      <PdfDropzone />
    </main>
  );
}
