import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugifyColumnKey, generateUniqueColumnKey } from "@/lib/utils";

// Získání všech sloupců tabulky
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;
    const columns = await db.column.findMany({
      where: { tableId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ columns });
  } catch (error) {
    console.error("Get columns error:", error);
    return NextResponse.json({ error: "Chyba při načítání sloupců" }, { status: 500 });
  }
}

// Přidání nového sloupce do tabulky s plnou konfigurací
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;
    const body = await request.json();
    const {
      label,
      key,
      type,
      description,
      isRequired,
      isUnique,
      isPrimary,
      defaultValue,
      config,
    } = body;

    if (!label || !type) {
      return NextResponse.json({ error: "Zadejte název a typ sloupce" }, { status: 400 });
    }

    // Inteligentní a bezpečné generování systémového klíče sloupce
    const existingCols = await db.column.findMany({
      where: { tableId },
      select: { key: true },
    });
    const existingKeys = new Set(existingCols.map((c) => c.key));

    const rawKey = key?.trim() || slugifyColumnKey(label);
    const finalKey = generateUniqueColumnKey(rawKey, existingKeys);

    // Pokud je označeno jako primární, zrušíme primární příznak u ostatních
    if (isPrimary) {
      await db.column.updateMany({
        where: { tableId },
        data: { isPrimary: false },
      });
    }

    const lastCol = await db.column.findFirst({
      where: { tableId },
      orderBy: { sortOrder: "desc" },
    });
    const nextSortOrder = (lastCol?.sortOrder ?? 0) + 1;

    const column = await db.column.create({
      data: {
        tableId,
        key: finalKey,
        label,
        type,
        description: description || null,
        isRequired: !!isRequired,
        isUnique: !!isUnique,
        isPrimary: !!isPrimary,
        defaultValue: defaultValue !== undefined && defaultValue !== "" ? defaultValue : null,
        config: config || {},
        sortOrder: nextSortOrder,
      },
    });

    return NextResponse.json({ success: true, column });
  } catch (error) {
    console.error("Add column error:", error);
    return NextResponse.json({ error: "Chyba při vytváření sloupce" }, { status: 500 });
  }
}

// Změna pořadí sloupců (Reorder)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;
    const body = await request.json();
    const columnIds: string[] = body.columnIds || [];

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      return NextResponse.json({ error: "Chybí seznam sloupců" }, { status: 400 });
    }

    await db.$transaction(
      columnIds.map((id, index) =>
        db.column.update({
          where: { id, tableId },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder columns error:", error);
    return NextResponse.json({ error: "Chyba při změně pořadí sloupců" }, { status: 500 });
  }
}

export const PATCH = PUT;

