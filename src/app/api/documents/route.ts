import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/user";
import { createDocument } from "@/lib/repositories/documents";

// Il repository usa il service role: runtime Node, non Edge.
export const runtime = "nodejs";

const createDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  storagePath: z.string().min(1).max(1024),
});

/**
 * POST /api/documents
 * Crea la riga in `documents` dopo l'upload del PDF su Storage.
 * L'insert passa di qui perche' la RLS concede all'anon la sola lettura.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  // Il primo segmento del path identifica il proprietario dell'oggetto su
  // Storage: se non combacia, il documento punterebbe al file di un altro.
  if (!parsed.data.storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json(
      { error: "Percorso di Storage non valido" },
      { status: 400 },
    );
  }

  try {
    const document = await createDocument({ ...parsed.data, userId: user.id });
    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents", error);
    return NextResponse.json(
      { error: "Impossibile creare il documento" },
      { status: 500 },
    );
  }
}
