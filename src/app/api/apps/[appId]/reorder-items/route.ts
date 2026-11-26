import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
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
    const items: Array<{ id: string; type: "table" | "dashboard" }> = body.items || [];

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Neplatný formát položek" }, { status: 400 });
    }

    await db.$transaction(
      items.map((item, index) => {
        if (item.type === "table") {
          return db.table.update({
            where: { id: item.id, appId },
            data: { sortOrder: index },
          });
        } else {
          return db.dashboard.update({
            where: { id: item.id, appId },
            data: { sortOrder: index },
          });
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder app items error:", error);
    return NextResponse.json({ error: "Chyba při změně pořadí položek" }, { status: 500 });
  }
}

export const PATCH = PUT;
