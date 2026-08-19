import { NextResponse } from "next/server";
import { z } from "zod";

import { createDocument } from "@/lib/repositories/documents";

// Il repository usa il service role: runtime Node, non Edge.
export const runtime = "nodejs";

const createDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  storagePath: z.string().min(1).max(1024),
  fileUrl: z.string().url(),
});

/**
 * POST /api/documents
 * Crea la riga in `documents` dopo l'upload del PDF su Storage.
 * L'insert passa di qui perche' la RLS concede all'anon la sola lettura.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const document = await createDocument(parsed.data);
    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents", error);
    return NextResponse.json(
      { error: "Impossibile creare il documento" },
      { status: 500 },
    );
  }
}
