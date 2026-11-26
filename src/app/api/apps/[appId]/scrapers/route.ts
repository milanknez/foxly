import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Získání všech Web Scraperů pro danou aplikaci
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

    const scrapers = await db.automation.findMany({
      where: {
        table: { appId },
        triggerType: "SCHEDULED_SCRAPE",
      },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            singularName: true,
            columns: {
              select: { id: true, key: true, label: true, type: true },
            },
          },
        },
        executionLogs: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, scrapers });
  } catch (error: any) {
    console.error("GET scrapers error:", error);
    return NextResponse.json(
      { error: "Chyba při načítání scraperů" },
      { status: 500 }
    );
  }
}

// Vytvoření nového Web Scraperu
export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      tableId,
      preset,
      url,
      schedule,
      fieldMapping,
      dedupeKey,
      strategy,
      isActive,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Zadejte název úlohy" }, { status: 400 });
    }

    if (!tableId) {
      return NextResponse.json({ error: "Vyberte cílovou tabulku" }, { status: 400 });
    }

    const scraper = await db.automation.create({
      data: {
        tableId,
        name: name.trim(),
        description: description || null,
        triggerType: "SCHEDULED_SCRAPE",
        triggerConfig: {
          preset: preset || "CUSTOM",
          url: url || "",
          schedule: schedule || "MANUAL", // MANUAL, HOURLY, DAILY_06, WEEKLY
        } as Prisma.InputJsonValue,
        actionType: "DATA_IMPORT",
        actionConfig: {
          fieldMapping: fieldMapping || {},
          dedupeKey: dedupeKey || null,
          strategy: strategy || "UPSERT", // UPSERT, APPEND
        } as Prisma.InputJsonValue,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            singularName: true,
            columns: {
              select: { id: true, key: true, label: true, type: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, scraper });
  } catch (error: any) {
    console.error("POST scraper error:", error);
    return NextResponse.json(
      { error: error.message || "Chyba při ukládání scraperu" },
      { status: 500 }
    );
  }
}
