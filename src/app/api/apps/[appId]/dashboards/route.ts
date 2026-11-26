import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Získání dashboardů aplikace
export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { appId } = await params;
    const dashboards = await db.dashboard.findMany({
      where: { appId },
      include: {
        widgets: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ dashboards });
  } catch (error) {
    console.error("GET dashboards error:", error);
    return NextResponse.json({ error: "Chyba při načítání dashboardů" }, { status: 500 });
  }
}

// Vytvoření nového dashboardu v aplikaci
export async function POST(
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
    const { name, description, icon } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Zadejte název dashboardu" }, { status: 400 });
    }

    const app = await db.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json({ error: "Aplikace nenalezena" }, { status: 404 });
    }

    const lastDashboard = await db.dashboard.findFirst({
      where: { appId },
      orderBy: { sortOrder: "desc" },
    });

    const newDashboard = await db.dashboard.create({
      data: {
        appId,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || "LayoutDashboard",
        sortOrder: (lastDashboard?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, dashboard: newDashboard });
  } catch (error) {
    console.error("Create dashboard error:", error);
    return NextResponse.json({ error: "Chyba při vytváření dashboardu" }, { status: 500 });
  }
}
