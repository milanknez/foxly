import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Získání nebo úprava tabulky
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
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        columns: { orderBy: { sortOrder: "asc" } },
        views: true,
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Tabulka nenalezena" }, { status: 404 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error("GET table error:", error);
    return NextResponse.json({ error: "Chyba při načítání tabulky" }, { status: 500 });
  }
}

// Úprava názvu, ikony nebo popisu tabulky
export async function PATCH(
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

    const updated = await db.table.update({
      where: { id: tableId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.singularName && { singularName: body.singularName }),
        ...(body.icon && { icon: body.icon }),
        ...(body.customScript !== undefined && { customScript: body.customScript }),
      },
    });

    return NextResponse.json({ success: true, table: updated });
  } catch (error) {
    console.error("PATCH table error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci tabulky" }, { status: 500 });
  }
}

// Smazání tabulky
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;

    await db.$transaction(async (tx) => {
      // Smazat auditní logy k záznamům této tabulky
      const records = await tx.record.findMany({
        where: { tableId },
        select: { id: true },
      });
      const recordIds = records.map((r) => r.id);

      if (recordIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: { recordId: { in: recordIds } },
        });
      }

      await tx.table.delete({
        where: { id: tableId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE table error:", error);
    return NextResponse.json({ error: "Chyba při mazání tabulky" }, { status: 500 });
  }
}
