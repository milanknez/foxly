import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Získání detailu automatizace včetně logů
export async function GET(
  request: Request,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { automationId } = await params;

    const automation = await db.automation.findUnique({
      where: { id: automationId },
      include: {
        table: {
          include: {
            columns: { orderBy: { sortOrder: "asc" } },
          },
        },
        executionLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!automation) {
      return NextResponse.json({ error: "Automatizace nenalezena" }, { status: 404 });
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("GET automation detail error:", error);
    return NextResponse.json({ error: "Chyba při načítání detailu" }, { status: 500 });
  }
}

// Úprava automatizace (např. zapnutí/vypnutí, změna podmínek nebo akcí)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { automationId } = await params;
    const body = await request.json();

    const updateData: Prisma.AutomationUpdateInput = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.triggerType !== undefined) updateData.triggerType = body.triggerType;
    if (body.triggerConfig !== undefined) updateData.triggerConfig = body.triggerConfig as Prisma.InputJsonValue;
    if (body.conditions !== undefined) updateData.conditions = body.conditions as Prisma.InputJsonValue;
    if (body.actions !== undefined) updateData.actions = body.actions as Prisma.InputJsonValue;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const updated = await db.automation.update({
      where: { id: automationId },
      data: updateData,
      include: {
        executionLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({ success: true, automation: updated });
  } catch (error) {
    console.error("PATCH automation error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci automatizace" }, { status: 500 });
  }
}

// Smazání automatizace
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { automationId } = await params;

    await db.automation.delete({
      where: { id: automationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE automation error:", error);
    return NextResponse.json({ error: "Chyba při mazání automatizace" }, { status: 500 });
  }
}
