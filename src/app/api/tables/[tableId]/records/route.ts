import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { triggerAutomationsForEvent } from "@/lib/workflow-engine";
import { getMemberTablePermission } from "@/lib/permissions";

// Získání všech záznamů dané tabulky s ověřením oprávnění uživatele
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
    const perm = await getMemberTablePermission(session.id, tableId);

    if (!perm.canRead) {
      return NextResponse.json({ error: "Nemáte oprávnění k prohlížení této tabulky" }, { status: 403 });
    }

    const whereClause: Prisma.RecordWhereInput = { tableId };
    if (perm.onlyOwnRecords) {
      whereClause.createdById = session.id;
    }

    const records = await db.record.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records, userPermissions: perm });
  } catch (error) {
    console.error("GET records error:", error);
    return NextResponse.json({ error: "Chyba při načítání záznamů" }, { status: 500 });
  }
}

// Vytvoření nového řádku v tabulce s ověřením oprávnění
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
    const perm = await getMemberTablePermission(session.id, tableId);

    if (!perm.canCreate) {
      return NextResponse.json({ error: "Nemáte oprávnění přidávat záznamy do této tabulky" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const data = (body.data && typeof body.data === "object" ? body.data : body) || {};

    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        columns: true,
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Tabulka nenalezena" }, { status: 404 });
    }

    // Výchozí hodnoty pro sloupce, pokud nebyly předány
    const initialData: Record<string, unknown> = { ...data };
    for (const col of table.columns) {
      if (initialData[col.key] === undefined) {
        if (col.type === "CHECKBOX") initialData[col.key] = false;
        else if (col.type === "NUMBER" || col.type === "CURRENCY") initialData[col.key] = 0;
        else if (col.defaultValue !== null && col.defaultValue !== undefined) {
          initialData[col.key] = col.defaultValue;
        } else {
          initialData[col.key] = "";
        }
      }
    }

    const record = await db.$transaction(async (tx) => {
      const newRec = await tx.record.create({
        data: {
          tableId,
          data: initialData as Prisma.InputJsonValue,
          createdById: session.id,
          source: "INTERNAL",
        },
      });

      await tx.auditLog.create({
        data: {
          recordId: newRec.id,
          userId: session.id,
          action: "CREATE",
          changes: { initial: initialData } as Prisma.InputJsonValue,
        },
      });

      return newRec;
    });

    // Spuštění workflow automatizací (např. ON_CREATE)
    triggerAutomationsForEvent({
      event: "CREATE",
      tableId,
      record: { id: record.id, data: (record.data as Record<string, unknown>) || {} },
    }).catch((err) => console.error("Workflow trigger error on create:", err));

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Create record error:", error);
    return NextResponse.json({ error: "Chyba při vytváření záznamu" }, { status: 500 });
  }
}

// Hromadné uložení změn v tabulce v rámci jedné transakce (Batch Save)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;
    const perm = await getMemberTablePermission(session.id, tableId);

    if (!perm.canUpdate) {
      return NextResponse.json({ error: "Nemáte oprávnění upravovat záznamy v této tabulce" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Array<{ id: string; data: Record<string, unknown> }> = body.updates || [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Žádné změny k uložení" }, { status: 400 });
    }

    const updateIds = updates.map((u) => u.id);

    // Pokud uživatel smí editovat pouze své vlastní záznamy
    if (perm.onlyOwnRecords) {
      const existingRecords = await db.record.findMany({
        where: { id: { in: updateIds }, tableId },
        select: { id: true, createdById: true },
      });
      const hasOtherUsersRecord = existingRecords.some((r) => r.createdById !== session.id);
      if (hasOtherUsersRecord) {
        return NextResponse.json({ error: "Můžete upravovat pouze své vlastní záznamy" }, { status: 403 });
      }
    }

    const updatedRecords = await db.$transaction(async (tx) => {
      // Hromadné načtení existujících záznamů v jednom dotazu (místo N individuálních dotazů)
      const existingList = await tx.record.findMany({
        where: { id: { in: updateIds }, tableId },
      });
      const existingMap = new Map(existingList.map((r) => [r.id, r]));

      const results = [];
      const auditEntries: Array<{
        recordId: string;
        userId: string;
        action: string;
        changes: Prisma.InputJsonValue;
      }> = [];

      for (const item of updates) {
        const existing = existingMap.get(item.id);
        if (!existing) continue;

        const oldData = (existing.data as Record<string, unknown>) || {};
        const mergedData = { ...oldData, ...item.data };

        const updated = await tx.record.update({
          where: { id: item.id },
          data: {
            data: mergedData as Prisma.InputJsonValue,
          },
        });

        auditEntries.push({
          recordId: item.id,
          userId: session.id,
          action: "UPDATE",
          changes: { before: oldData, after: mergedData } as Prisma.InputJsonValue,
        });

        results.push(updated);
      }

      if (auditEntries.length > 0) {
        await tx.auditLog.createMany({
          data: auditEntries,
        });
      }

      return results;
    });

    // Spuštění workflow automatizací pro každý aktualizovaný záznam
    for (const updated of updatedRecords) {
      triggerAutomationsForEvent({
        event: "UPDATE",
        tableId,
        record: { id: updated.id, data: (updated.data as Record<string, unknown>) || {} },
      }).catch((err) => console.error("Workflow trigger error on batch update:", err));
    }

    return NextResponse.json({
      success: true,
      count: updatedRecords.length,
      records: updatedRecords,
    });
  } catch (error) {
    console.error("Batch update records error:", error);
    return NextResponse.json({ error: "Chyba při hromadném ukládání" }, { status: 500 });
  }
}

// Hromadné smazání záznamů (Bulk Delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;
    const perm = await getMemberTablePermission(session.id, tableId);

    if (!perm.canDelete) {
      return NextResponse.json({ error: "Nemáte oprávnění mazat záznamy z této tabulky" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const recordIds: string[] = body.recordIds || [];

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: "Žádné záznamy ke smazání" }, { status: 400 });
    }

    if (perm.onlyOwnRecords) {
      const recordsToDelete = await db.record.findMany({
        where: { id: { in: recordIds }, tableId },
        select: { id: true, createdById: true },
      });
      const hasOtherUsersRecord = recordsToDelete.some((r) => r.createdById !== session.id);
      if (hasOtherUsersRecord) {
        return NextResponse.json({ error: "Můžete mazat pouze své vlastní záznamy" }, { status: 403 });
      }
    }

    await db.$transaction(async (tx) => {
      // Hromadné smazání v jediném dotazu pro audit a záznamy
      await tx.auditLog.deleteMany({ where: { recordId: { in: recordIds } } });
      await tx.record.deleteMany({ where: { id: { in: recordIds }, tableId } });
    });

    return NextResponse.json({ success: true, count: recordIds.length });
  } catch (error) {
    console.error("Bulk delete records error:", error);
    return NextResponse.json({ error: "Chyba při hromadném mazání" }, { status: 500 });
  }
}
