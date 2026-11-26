import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Získání všech automatizací pro danou tabulku
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

    const automations = await db.automation.findMany({
      where: { tableId },
      orderBy: { createdAt: "desc" },
      include: {
        executionLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    const columns = await db.column.findMany({
      where: { tableId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ automations, columns });
  } catch (error) {
    console.error("GET automations error:", error);
    return NextResponse.json({ error: "Chyba při načítání automatizací" }, { status: 500 });
  }
}

// Vytvoření nové automatizace (Workflow pravidla)
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

    const {
      name,
      description,
      triggerType,
      triggerConfig,
      conditions,
      actions,
      isActive,
    } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: "Název a typ spouštěče jsou povinné" }, { status: 400 });
    }

    const automation = await db.automation.create({
      data: {
        tableId,
        name,
        description: description || null,
        triggerType,
        triggerConfig: (triggerConfig || {}) as Prisma.InputJsonValue,
        conditions: (conditions || []) as Prisma.InputJsonValue,
        actionType: "MULTI",
        actionConfig: {},
        actions: (actions || []) as Prisma.InputJsonValue,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        executionLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ success: true, automation });
  } catch (error) {
    console.error("POST automation error:", error);
    return NextResponse.json({ error: "Chyba při ukládání automatizace" }, { status: 500 });
  }
}
