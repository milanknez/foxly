import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string; scraperId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { scraperId } = await params;

    const scraper = await db.automation.findUnique({
      where: { id: scraperId },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            columns: {
              select: { id: true, key: true, label: true, type: true },
            },
          },
        },
        executionLogs: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!scraper) {
      return NextResponse.json({ error: "Scraper nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ success: true, scraper });
  } catch (error: any) {
    console.error("GET scraper error:", error);
    return NextResponse.json({ error: "Chyba při načítání" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ appId: string; scraperId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { scraperId } = await params;
    const body = await request.json();

    const updateData: Prisma.AutomationUpdateInput = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.triggerConfig !== undefined) {
      updateData.triggerConfig = body.triggerConfig as Prisma.InputJsonValue;
    }
    if (body.actionConfig !== undefined) {
      updateData.actionConfig = body.actionConfig as Prisma.InputJsonValue;
    }
    if (body.tableId !== undefined) {
      updateData.table = { connect: { id: body.tableId } };
    }

    const updated = await db.automation.update({
      where: { id: scraperId },
      data: updateData,
      include: {
        table: {
          select: {
            id: true,
            name: true,
            columns: {
              select: { id: true, key: true, label: true, type: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, scraper: updated });
  } catch (error: any) {
    console.error("PATCH scraper error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ appId: string; scraperId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { scraperId } = await params;

    await db.automation.delete({
      where: { id: scraperId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE scraper error:", error);
    return NextResponse.json({ error: "Chyba při mazání" }, { status: 500 });
  }
}
