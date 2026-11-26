import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";
import { triggerAutomationsForEvent } from "@/lib/workflow-engine";

// Veřejný REST API endpoint pro čtení a přidávání záznamů tabulky (pro AI a externí systémy)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { tableId } = await params;

  const table = await db.table.findUnique({
    where: { id: tableId },
    include: {
      app: {
        select: { workspaceId: true },
      },
      columns: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          key: true,
          label: true,
          type: true,
          isRequired: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!table || table.app.workspaceId !== auth.workspaceId) {
    return NextResponse.json({ error: "Tabulka nenalezena nebo k ní nemáte přístup" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase().trim() || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Number(searchParams.get("offset")) || 0;

  const allRecords = await db.record.findMany({
    where: { tableId },
    orderBy: { createdAt: "desc" },
  });

  // Filtrování
  let filtered = allRecords;
  if (search) {
    filtered = allRecords.filter((r) => {
      const data = (r.data as Record<string, unknown>) || {};
      return Object.values(data).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(search)
      );
    });
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    table: {
      id: table.id,
      name: table.name,
      columns: table.columns,
    },
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
    records: paginated.map((r) => ({
      id: r.id,
      data: r.data,
      source: r.source,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const perms = (auth.apiKey?.permissions as Record<string, any>) || {};
  if (perms.readOnly) {
    return NextResponse.json(
      { error: "Tento API token má pouze oprávnění pro čtení (Read-Only)" },
      { status: 403 }
    );
  }

  const { tableId } = await params;

  const table = await db.table.findUnique({
    where: { id: tableId },
    include: {
      app: { select: { workspaceId: true } },
      columns: true,
    },
  });

  if (!table || table.app.workspaceId !== auth.workspaceId) {
    return NextResponse.json({ error: "Tabulka nenalezena nebo k ní nemáte přístup" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const rawData = body.data || body;

  if (!rawData || typeof rawData !== "object") {
    return NextResponse.json(
      { error: "Chybný formát těla požadavku. Očekáván objekt { data: { ... } }" },
      { status: 400 }
    );
  }

  // Příprava dat podle sloupců (doplnění výchozích hodnot)
  const initialData: Record<string, unknown> = { ...rawData };
  for (const col of table.columns) {
    if (initialData[col.key] === undefined) {
      if (col.defaultValue !== null && col.defaultValue !== undefined) {
        initialData[col.key] = col.defaultValue;
      } else if (col.type === "CHECKBOX") {
        initialData[col.key] = false;
      }
    }
  }

  const record = await db.record.create({
    data: {
      tableId,
      data: initialData as Prisma.InputJsonValue,
      source: `API_${auth.apiKey.name || "TOKEN"}`,
    },
  });

  // Spuštění automatizací
  triggerAutomationsForEvent({
    event: "CREATE",
    tableId,
    record: { id: record.id, data: (record.data as Record<string, unknown>) || {} },
  }).catch((err) => console.error("API create automation trigger error:", err));

  return NextResponse.json(
    {
      success: true,
      message: "Záznam byl úspěšně vytvořen přes Public API",
      record: {
        id: record.id,
        data: record.data,
        createdAt: record.createdAt,
      },
    },
    { status: 201 }
  );
}
