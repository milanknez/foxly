import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Vytvoření nové Tabulky v rámci Aplikace
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
    const { name, singularName, icon } = body;

    if (!name) {
      return NextResponse.json({ error: "Zadejte název tabulky" }, { status: 400 });
    }

    const app = await db.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json({ error: "Aplikace nenalezena" }, { status: 404 });
    }

    const lastTable = await db.table.findFirst({
      where: { appId },
      orderBy: { sortOrder: "desc" },
    });

    const newTable = await db.table.create({
      data: {
        appId,
        name,
        singularName: singularName || name,
        icon: icon || "Table",
        sortOrder: (lastTable?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, table: newTable });
  } catch (error) {
    console.error("Create table error:", error);
    return NextResponse.json({ error: "Chyba při vytváření tabulky" }, { status: 500 });
  }
}
