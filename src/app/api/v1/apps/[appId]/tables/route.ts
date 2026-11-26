import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";

// Veřejné REST API pro vytvoření nové tabulky v rámci aplikace
export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
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

    const { appId } = await params;
    const app = await db.app.findUnique({
      where: { id: appId },
      include: {
        workspace: true,
      },
    });

    if (!app || app.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: "Aplikace nebyla nalezena nebo k ní nemáte přístup" }, { status: 404 });
    }

    const body = await request.json();
    const { name, singularName, icon, columns } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Zadejte platný název tabulky (name)" }, { status: 400 });
    }

    const lastTable = await db.table.findFirst({
      where: { appId },
      orderBy: { sortOrder: "desc" },
    });

    const newTable = await db.table.create({
      data: {
        appId,
        name: name.trim(),
        singularName: (singularName || name).trim(),
        icon: icon || "Table",
        sortOrder: (lastTable?.sortOrder ?? 0) + 1,
      },
    });

    // Vytvoření defaultního zobrazení GRID
    await db.view.create({
      data: {
        tableId: newTable.id,
        name: "Výchozí tabulka",
        type: "GRID",
        isDefault: true,
      },
    });

    // Volitelné vytvoření počátečních sloupců, pokud byly předány v požadavku
    if (Array.isArray(columns) && columns.length > 0) {
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (col && col.key && col.label) {
          await db.column.create({
            data: {
              tableId: newTable.id,
              key: col.key,
              label: col.label,
              type: col.type || "TEXT",
              description: col.description || null,
              isPrimary: !!col.isPrimary,
              isRequired: !!col.isRequired,
              isUnique: !!col.isUnique,
              defaultValue: col.defaultValue ?? null,
              config: col.config || {},
              sortOrder: i,
            },
          });
        }
      }
    }

    const createdTable = await db.table.findUnique({
      where: { id: newTable.id },
      include: {
        columns: {
          orderBy: { sortOrder: "asc" },
        },
        views: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tabulka byla úspěšně vytvořena",
      table: createdTable,
    }, { status: 201 });
  } catch (error) {
    console.error("V1 Create table error:", error);
    return NextResponse.json({ error: "Chyba při vytváření tabulky" }, { status: 500 });
  }
}
