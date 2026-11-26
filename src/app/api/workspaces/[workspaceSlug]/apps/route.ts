import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Vytvoření nové Aplikace v rámci Workspace
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug } = await params;
    const body = await request.json();
    const { name, description, icon, color } = body;

    if (!name) {
      return NextResponse.json({ error: "Zadejte název aplikace" }, { status: 400 });
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const lastApp = await db.app.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { sortOrder: "desc" },
    });

    const newApp = await db.app.create({
      data: {
        workspaceId: workspace.id,
        name,
        description: description || "",
        icon: icon || "Folder",
        color: color || "#2563eb",
        sortOrder: (lastApp?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, app: newApp });
  } catch (error) {
    console.error("Create app error:", error);
    return NextResponse.json({ error: "Chyba při vytváření aplikace" }, { status: 500 });
  }
}
