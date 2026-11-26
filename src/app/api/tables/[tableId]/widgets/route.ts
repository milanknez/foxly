import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Uložení konfigurace widgetů pro tabulku / výchozí pohled
export async function PUT(
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
    const { widgets } = body;

    if (!Array.isArray(widgets)) {
      return NextResponse.json(
        { error: "Widgets musí být pole" },
        { status: 400 }
      );
    }

    // Najdeme výchozí pohled tabulky, případně první pohled
    let view = await db.view.findFirst({
      where: { tableId, isDefault: true },
    });

    if (!view) {
      view = await db.view.findFirst({
        where: { tableId },
      });
    }

    if (view) {
      const currentConfig = (view.config as Record<string, unknown>) || {};
      await db.view.update({
        where: { id: view.id },
        data: {
          config: {
            ...currentConfig,
            widgets,
          },
        },
      });
    } else {
      // Vytvoříme výchozí pohled, pokud žádný neexistuje
      await db.view.create({
        data: {
          tableId,
          name: "Výchozí pohled",
          type: "GRID",
          isDefault: true,
          config: { widgets },
        },
      });
    }

    return NextResponse.json({ success: true, widgets });
  } catch (error) {
    console.error("Save widgets error:", error);
    return NextResponse.json(
      { error: "Chyba při ukládání widgetů" },
      { status: 500 }
    );
  }
}
