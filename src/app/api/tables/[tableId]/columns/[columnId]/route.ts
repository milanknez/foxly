import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Úprava vlastností existujícího sloupce
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tableId: string; columnId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId, columnId } = await params;
    const body = await request.json();
    const {
      label,
      description,
      isRequired,
      isUnique,
      isPrimary,
      defaultValue,
      config,
    } = body;

    if (isPrimary) {
      await db.column.updateMany({
        where: { tableId },
        data: { isPrimary: false },
      });
    }

    const updated = await db.column.update({
      where: { id: columnId },
      data: {
        ...(label ? { label } : {}),
        description: description !== undefined ? description : null,
        isRequired: isRequired !== undefined ? !!isRequired : false,
        isUnique: isUnique !== undefined ? !!isUnique : false,
        isPrimary: isPrimary !== undefined ? !!isPrimary : false,
        defaultValue: defaultValue !== undefined && defaultValue !== "" ? defaultValue : null,
        ...(config ? { config } : {}),
      },
    });

    return NextResponse.json({ success: true, column: updated });
  } catch (error) {
    console.error("Update column error:", error);
    return NextResponse.json({ error: "Chyba při úpravě sloupce" }, { status: 500 });
  }
}

// Smazání sloupce
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableId: string; columnId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { columnId } = await params;

    await db.column.delete({
      where: { id: columnId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete column error:", error);
    return NextResponse.json({ error: "Chyba při mazání sloupce" }, { status: 500 });
  }
}
