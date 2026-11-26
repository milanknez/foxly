import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Úprava widgetu
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string; widgetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { widgetId } = await params;
    const body = await request.json();

    const widget = await db.widget.update({
      where: { id: widgetId },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.targetField !== undefined && { targetField: body.targetField }),
        ...(body.aggregation !== undefined && { aggregation: body.aggregation }),
        ...(body.groupField !== undefined && { groupField: body.groupField }),
        ...(body.config !== undefined && { config: body.config }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json({ success: true, widget });
  } catch (error) {
    console.error("PATCH widget error:", error);
    return NextResponse.json({ error: "Chyba při úpravě widgetu" }, { status: 500 });
  }
}

// Smazání widgetu
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string; widgetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { widgetId } = await params;

    await db.widget.delete({
      where: { id: widgetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE widget error:", error);
    return NextResponse.json({ error: "Chyba při mazání widgetu" }, { status: 500 });
  }
}
