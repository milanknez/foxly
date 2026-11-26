import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Úprava aplikace (název, popis, barva, ikona)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { appId } = await params;
    const body = await request.json();

    const updated = await db.app.update({
      where: { id: appId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.color !== undefined && { color: body.color }),
      },
    });

    return NextResponse.json({ success: true, app: updated });
  } catch (error) {
    console.error("PATCH app error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci aplikace" }, { status: 500 });
  }
}

// Smazání celé aplikace včetně jejích tabulek, dashboardů a záznamů
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { appId } = await params;

    const app = await db.app.findUnique({
      where: { id: appId },
      include: {
        tables: {
          select: { id: true },
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: "Aplikace nenalezena" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      const tableIds = app.tables.map((t) => t.id);

      if (tableIds.length > 0) {
        // Najít záznamy pro smazání auditních logů
        const records = await tx.record.findMany({
          where: { tableId: { in: tableIds } },
          select: { id: true },
        });
        const recordIds = records.map((r) => r.id);

        if (recordIds.length > 0) {
          await tx.auditLog.deleteMany({
            where: { recordId: { in: recordIds } },
          });
        }
      }

      // Smazat aplikaci (kaskádovitě smaže tables, columns, records, views, dashboards, widgets)
      await tx.app.delete({
        where: { id: appId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE app error:", error);
    return NextResponse.json({ error: "Chyba při mazání aplikace" }, { status: 500 });
  }
}
