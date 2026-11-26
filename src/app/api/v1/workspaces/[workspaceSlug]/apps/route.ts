import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";

// Veřejné REST API pro vytvoření nové aplikace v rámci workspace
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    if (auth.apiKey?.permissions?.readOnly) {
      return NextResponse.json(
        { error: "Tento API token má pouze oprávnění pro čtení (Read-Only)" },
        { status: 403 }
      );
    }

    const { workspaceSlug } = await params;
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace || workspace.id !== auth.workspaceId) {
      return NextResponse.json({ error: "Přístup k této firmě byl odepřen" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, icon, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Zadejte platný název aplikace (name)" }, { status: 400 });
    }

    const lastApp = await db.app.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { sortOrder: "desc" },
    });

    const newApp = await db.app.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        description: description || "",
        icon: icon || "Folder",
        color: color || "#3b82f6",
        sortOrder: (lastApp?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Aplikace byla úspěšně vytvořena",
      app: newApp,
    }, { status: 201 });
  } catch (error) {
    console.error("V1 Create app error:", error);
    return NextResponse.json({ error: "Chyba při vytváření aplikace" }, { status: 500 });
  }
}
