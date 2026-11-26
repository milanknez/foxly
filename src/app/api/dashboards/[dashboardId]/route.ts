import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Získání dashboardu
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { dashboardId } = await params;
    const dashboard = await db.dashboard.findUnique({
      where: { id: dashboardId },
      include: {
        widgets: {
          include: {
            table: {
              include: {
                columns: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error("GET dashboard error:", error);
    return NextResponse.json({ error: "Chyba při načítání dashboardu" }, { status: 500 });
  }
}

// Úprava parametrů dashboardu
export async function PATCH(
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

    const updated = await db.dashboard.update({
      where: { id: dashboardId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.layout !== undefined && { layout: body.layout }),
      },
    });

    return NextResponse.json({ success: true, dashboard: updated });
  } catch (error) {
    console.error("PATCH dashboard error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci dashboardu" }, { status: 500 });
  }
}

// Smazání celého dashboardu
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { dashboardId } = await params;

    await db.dashboard.delete({
      where: { id: dashboardId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE dashboard error:", error);
    return NextResponse.json({ error: "Chyba při mazání dashboardu" }, { status: 500 });
  }
}
