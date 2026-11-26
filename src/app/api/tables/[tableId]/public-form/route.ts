import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Získání stavu veřejného formuláře pro danou tabulku
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;

    const formView = await db.view.findFirst({
      where: {
        tableId,
        type: "FORM",
      },
    });

    if (!formView) {
      return NextResponse.json({
        success: true,
        isPublic: false,
        shareToken: null,
        view: null,
      });
    }

    return NextResponse.json({
      success: true,
      isPublic: formView.isPublic,
      shareToken: formView.shareToken,
      view: formView,
    });
  } catch (error) {
    console.error("GET public form error:", error);
    return NextResponse.json({ error: "Chyba při načítání formuláře" }, { status: 500 });
  }
}

// Zveřejnění, aktualizace nebo deaktivace veřejného formuláře
export async function POST(
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
    const { isPublic, title, description, fields } = body;

    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        columns: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Tabulka nenalezena" }, { status: 404 });
    }

    // Najdeme existující pohled typu FORM
    const existingView = await db.view.findFirst({
      where: {
        tableId,
        type: "FORM",
      },
    });

    if (!isPublic) {
      if (existingView) {
        await db.view.update({
          where: { id: existingView.id },
          data: { isPublic: false },
        });
      }
      return NextResponse.json({
        success: true,
        isPublic: false,
        shareToken: existingView?.shareToken || null,
      });
    }

    // Zapnutí / Zveřejnění formuláře
    const token =
      existingView?.shareToken ||
      crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const prevConfig = (existingView?.config as Record<string, unknown>) || {};
    const updatedConfig = {
      ...prevConfig,
      title: title || prevConfig.title || table.name,
      description:
        description !== undefined
          ? description
          : prevConfig.description || "Vyplňte prosím tento formulář.",
      fields:
        Array.isArray(fields) && fields.length > 0
          ? fields
          : prevConfig.fields || table.columns.map((c) => c.key),
    };

    let savedView;
    if (existingView) {
      savedView = await db.view.update({
        where: { id: existingView.id },
        data: {
          name: title || existingView.name || `Veřejný formulář - ${table.name}`,
          isPublic: true,
          shareToken: token,
          config: updatedConfig as Prisma.InputJsonValue,
        },
      });
    } else {
      savedView = await db.view.create({
        data: {
          tableId,
          name: title || `Veřejný formulář - ${table.name}`,
          type: "FORM",
          isPublic: true,
          shareToken: token,
          config: updatedConfig as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isPublic: true,
      shareToken: savedView.shareToken,
      view: savedView,
    });
  } catch (error) {
    console.error("POST public form error:", error);
    return NextResponse.json({ error: "Chyba při ukládání formuláře" }, { status: 500 });
  }
}
