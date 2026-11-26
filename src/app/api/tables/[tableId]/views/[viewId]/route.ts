import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Úprava tiskové šablony
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tableId: string; viewId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId, viewId } = await params;
    const body = await request.json();
    const { name, config, isDefault } = body;

    const existing = await db.view.findUnique({
      where: { id: viewId },
    });

    if (!existing || existing.tableId !== tableId) {
      return NextResponse.json({ error: "Pohled nenalezen" }, { status: 404 });
    }

    if (isDefault) {
      await db.view.updateMany({
        where: { tableId, type: existing.type },
        data: { isDefault: false },
      });
    }

    const updateData: Prisma.ViewUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = config as Prisma.InputJsonValue;
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

    const updated = await db.view.update({
      where: { id: viewId },
      data: updateData,
    });

    return NextResponse.json({ success: true, view: updated });
  } catch (error) {
    console.error("PATCH view error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci šablony" }, { status: 500 });
  }
}

// Smazání vlastní tiskové šablony
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableId: string; viewId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId, viewId } = await params;

    const existing = await db.view.findUnique({
      where: { id: viewId },
    });

    if (!existing || existing.tableId !== tableId) {
      return NextResponse.json({ error: "Šablona nenalezena" }, { status: 404 });
    }

    await db.view.delete({
      where: { id: viewId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE view error:", error);
    return NextResponse.json({ error: "Chyba při mazání šablony" }, { status: 500 });
  }
}
