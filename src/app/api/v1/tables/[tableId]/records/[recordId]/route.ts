import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";
import { triggerAutomationsForEvent } from "@/lib/workflow-engine";

// Veřejný REST API endpoint pro detail, úpravu nebo smazání konkrétního záznamu
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string; recordId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { tableId, recordId } = await params;

  const record = await db.record.findUnique({
    where: { id: recordId },
    include: {
      table: {
        include: {
          app: { select: { workspaceId: true } },
        },
      },
    },
  });

  if (!record || record.tableId !== tableId || record.table.app.workspaceId !== auth.workspaceId) {
    return NextResponse.json({ error: "Záznam nebyl nalezen" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    record: {
      id: record.id,
      data: record.data,
      source: record.source,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tableId: string; recordId: string }> }
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

  const { tableId, recordId } = await params;

  const record = await db.record.findUnique({
    where: { id: recordId },
    include: {
      table: {
        include: {
          app: { select: { workspaceId: true } },
        },
      },
    },
  });

  if (!record || record.tableId !== tableId || record.table.app.workspaceId !== auth.workspaceId) {
    return NextResponse.json({ error: "Záznam nebyl nalezen" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const patchData = body.data || body;

  if (!patchData || typeof patchData !== "object") {
    return NextResponse.json(
      { error: "Chybný formát požadavku. Očekáván objekt { data: { ... } }" },
      { status: 400 }
    );
  }

  const currentData = (record.data as Record<string, unknown>) || {};
  const updatedData = { ...currentData, ...patchData };

  const updated = await db.record.update({
    where: { id: recordId },
    data: {
      data: updatedData as Prisma.InputJsonValue,
    },
  });

  triggerAutomationsForEvent({
    event: "UPDATE",
    tableId,
    record: { id: updated.id, data: updatedData },
    previousRecord: { id: record.id, data: currentData },
  }).catch((err) => console.error("API update automation trigger error:", err));

  return NextResponse.json({
    success: true,
    message: "Záznam byl úspěšně aktualizován",
    record: {
      id: updated.id,
      data: updated.data,
      updatedAt: updated.updatedAt,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableId: string; recordId: string }> }
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

  const { tableId, recordId } = await params;

  const record = await db.record.findUnique({
    where: { id: recordId },
    include: {
      table: {
        include: {
          app: { select: { workspaceId: true } },
        },
      },
    },
  });

  if (!record || record.tableId !== tableId || record.table.app.workspaceId !== auth.workspaceId) {
    return NextResponse.json({ error: "Záznam nebyl nalezen" }, { status: 404 });
  }

  await db.record.delete({
    where: { id: recordId },
  });

  return NextResponse.json({
    success: true,
    message: "Záznam byl úspěšně smazán přes API",
  });
}
