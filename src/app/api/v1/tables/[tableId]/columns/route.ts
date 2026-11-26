import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { slugifyColumnKey, generateUniqueColumnKey } from "@/lib/utils";

// GET /api/v1/tables/[tableId]/columns - Získání seznamu sloupců tabulky
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { tableId } = await params;
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        app: {
          select: { workspaceId: true },
        },
      },
    });

    if (!table || table.app.workspaceId !== auth.workspaceId) {
      return NextResponse.json(
        { error: "Tabulka nebyla nalezena nebo k ní nemáte přístup" },
        { status: 404 }
      );
    }

    const columns = await db.column.findMany({
      where: { tableId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      columns,
    });
  } catch (error) {
    console.error("V1 Get columns error:", error);
    return NextResponse.json({ error: "Chyba při načítání sloupců" }, { status: 500 });
  }
}

// POST /api/v1/tables/[tableId]/columns - Vytvoření sloupce nebo více sloupců přes REST API
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
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

    const { tableId } = await params;
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        app: {
          select: { workspaceId: true },
        },
      },
    });

    if (!table || table.app.workspaceId !== auth.workspaceId) {
      return NextResponse.json(
        { error: "Tabulka nebyla nalezena nebo k ní nemáte přístup" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Podpora vytvoření jednoho sloupce nebo pole sloupců: { columns: [...] } nebo { label: "...", ... }
    const itemsToCreate = Array.isArray(body.columns)
      ? body.columns
      : Array.isArray(body)
      ? body
      : [body];

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ error: "Nebyla předána žádná data pro sloupce" }, { status: 400 });
    }

    const existingCols = await db.column.findMany({
      where: { tableId },
      select: { key: true, sortOrder: true },
      orderBy: { sortOrder: "desc" },
    });

    const existingKeys = new Set(existingCols.map((c) => c.key));
    let lastSortOrder = existingCols[0]?.sortOrder ?? -1;

    const createdColumns = [];

    for (const item of itemsToCreate) {
      const {
        label,
        key,
        type = "TEXT",
        description,
        isRequired,
        isUnique,
        isPrimary,
        defaultValue,
        config,
      } = item;

      if (!label || typeof label !== "string" || !label.trim()) {
        continue;
      }

      const rawKey = key?.trim() || slugifyColumnKey(label);
      const finalKey = generateUniqueColumnKey(rawKey, existingKeys);
      existingKeys.add(finalKey);

      if (isPrimary) {
        await db.column.updateMany({
          where: { tableId },
          data: { isPrimary: false },
        });
      }

      lastSortOrder += 1;

      const column = await db.column.create({
        data: {
          tableId,
          key: finalKey,
          label: label.trim(),
          type,
          description: description || null,
          isRequired: !!isRequired,
          isUnique: !!isUnique,
          isPrimary: !!isPrimary,
          defaultValue: defaultValue !== undefined && defaultValue !== "" ? defaultValue : null,
          config: config || {},
          sortOrder: lastSortOrder,
        },
      });

      createdColumns.push(column);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Úspěšně vytvořeno ${createdColumns.length} sloupců`,
        columns: createdColumns,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("V1 Create column error:", error);
    return NextResponse.json({ error: "Chyba při vytváření sloupce" }, { status: 500 });
  }
}
