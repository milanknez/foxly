import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Přidání nového widgetu na dashboard
export async function POST(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { dashboardId } = await params;
    const body = await request.json();
    const {
      tableId,
      title,
      type,
      targetField,
      aggregation = "COUNT",
      groupField,
      config = {},
      sortOrder,
    } = body;

    if (!tableId || !title || !type) {
      return NextResponse.json(
        { error: "Vyplňte název, tabulku a typ widgetu." },
        { status: 400 }
      );
    }

    const dashboard = await db.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard nenalezen" }, { status: 404 });
    }

    const lastWidget = await db.widget.findFirst({
      where: { dashboardId },
      orderBy: { sortOrder: "desc" },
    });

    const widget = await db.widget.create({
      data: {
        dashboardId,
        tableId,
        title: title.trim(),
        type,
        targetField: targetField || null,
        aggregation: aggregation || "COUNT",
        groupField: groupField || null,
        config: config || {},
        sortOrder: sortOrder ?? ((lastWidget?.sortOrder ?? 0) + 1),
      },
      include: {
        table: {
          include: {
            columns: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, widget });
  } catch (error) {
    console.error("Create widget error:", error);
    return NextResponse.json({ error: "Chyba při vytváření widgetu" }, { status: 500 });
  }
}
