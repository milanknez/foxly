import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; keyId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug, keyId } = await params;
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    await db.apiKey.deleteMany({
      where: {
        id: keyId,
        workspaceId: workspace.id,
      },
    });

    return NextResponse.json({ success: true, message: "API klíč byl úspěšně odvolán" });
  } catch (error) {
    console.error("DELETE api-key error:", error);
    return NextResponse.json({ error: "Chyba při odstraňování API klíče" }, { status: 500 });
  }
}
