import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Získání pohledů dané tabulky (podle volitelného typu: GRID, PRINT, FORM atd.)
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const views = await db.view.findMany({
      where: {
        tableId,
        ...(type ? { type } : {}),
      },
      orderBy: [
        { isDefault: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ success: true, views });
  } catch (error) {
    console.error("GET table views error:", error);
    return NextResponse.json({ error: "Chyba při načítání pohledů" }, { status: 500 });
  }
}

// Vytvoření nového vlastního pohledu (GRID nebo PRINT)
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
    const { name, config, isDefault, type = "GRID" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Zadejte název pohledu" }, { status: 400 });
    }

    // Pokud je označen jako výchozí, zrušíme výchozí u ostatních pohledů daného typu
    if (isDefault) {
      await db.view.updateMany({
        where: { tableId, type },
        data: { isDefault: false },
      });
    }

    const view = await db.view.create({
      data: {
        tableId,
        name: name.trim(),
        type,
        isDefault: Boolean(isDefault),
        config: (config || {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, view });
  } catch (error) {
    console.error("POST table view error:", error);
    return NextResponse.json({ error: "Chyba při ukládání pohledu" }, { status: 500 });
  }
}
