import DocumentList from "@/components/document-list";
import PdfDropzone from "@/components/pdf-dropzone";

// La lista riflette gli upload appena fatti: nessuna cache.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="max-w-md text-center">
        <p className="eyebrow">Lettura assistita di PDF</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
          ChatPDF
        </h1>
        <p className="mt-3 font-serif text-[0.9375rem] leading-7 text-ink-soft">
          Carica un PDF e fai domande sul suo contenuto. Ogni risposta cita la
          pagina da cui viene, e la pagina si apre con un clic.
        </p>
      </div>

      <PdfDropzone />

      <DocumentList />
    </main>
  );
}
