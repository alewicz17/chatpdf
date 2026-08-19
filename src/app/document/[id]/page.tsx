type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Colonna sinistra: viewer PDF (react-pdf) */}
      <section className="border-r border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-500">Documento</h2>
        <p className="mt-2 text-xs text-gray-400">ID: {id}</p>
        {/* TODO: render del PDF con react-pdf */}
      </section>

      {/* Colonna destra: chat */}
      <section className="flex flex-col p-6">
        <h2 className="text-sm font-medium text-gray-500">Chat</h2>
        {/* TODO: useChat da @ai-sdk/react verso /api/chat */}
      </section>
    </main>
  );
}
