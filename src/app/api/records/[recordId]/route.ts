import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { triggerAutomationsForEvent } from "@/lib/workflow-engine";
import { getMemberTablePermission } from "@/lib/permissions";

// Update buňky nebo celého řádku
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { recordId } = await params;
    const body = await request.json();
    const { key, value, data } = body;

    const existingRecord = await db.record.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        tableId: true,
        createdById: true,
        data: true,
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Záznam nenalezen" }, { status: 404 });
    }

    const perm = await getMemberTablePermission(session.id, existingRecord.tableId);
    if (!perm.canUpdate) {
      return NextResponse.json({ error: "Nemáte oprávnění upravovat tento záznam" }, { status: 403 });
    }

    if (perm.onlyOwnRecords && existingRecord.createdById !== session.id) {
      return NextResponse.json({ error: "Můžete upravovat pouze své vlastní záznamy" }, { status: 403 });
    }

    const currentData = (existingRecord.data as Record<string, unknown>) || {};
    let newData: Record<string, unknown>;
    let changes: Record<string, { old: unknown; new: unknown }> = {};

    if (key !== undefined) {
      // Inline editace jedné buňky
      changes[key] = { old: currentData[key], new: value };
      newData = { ...currentData, [key]: value };
    } else if (data) {
      // Kompletní formulářová editace řádku
      for (const k of Object.keys(data)) {
        if (currentData[k] !== data[k]) {
          changes[k] = { old: currentData[k], new: data[k] };
        }
      }
      newData = { ...currentData, ...data };
    } else {
      return NextResponse.json({ error: "Chybí data k aktualizaci" }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const rec = await tx.record.update({
        where: { id: recordId },
        data: {
          data: newData as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      if (Object.keys(changes).length > 0) {
        await tx.auditLog.create({
          data: {
            recordId: rec.id,
            userId: session.id,
            action: "UPDATE",
            changes: changes as Prisma.InputJsonValue,
          },
        });
      }

      return rec;
    });

    // Spuštění workflow automatizací (např. ON_FIELD_CHANGE)
    triggerAutomationsForEvent({
      event: "UPDATE",
      tableId: existingRecord.tableId,
      record: { id: updated.id, data: (updated.data as Record<string, unknown>) || {} },
      previousRecord: { id: existingRecord.id, data: (existingRecord.data as Record<string, unknown>) || {} },
      changedFieldKey: key,
    }).catch((err) => console.error("Workflow trigger error on update:", err));

    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    console.error("Update record error:", error);
    return NextResponse.json({ error: "Chyba při aktualizaci buňky" }, { status: 500 });
  }
}

// Smazání řádku
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { recordId } = await params;
    const existing = await db.record.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Záznam nenalezen" }, { status: 404 });
    }

    const perm = await getMemberTablePermission(session.id, existing.tableId);
    if (!perm.canDelete) {
      return NextResponse.json({ error: "Nemáte oprávnění smazat tento záznam" }, { status: 403 });
    }

    if (perm.onlyOwnRecords && existing.createdById !== session.id) {
      return NextResponse.json({ error: "Můžete mazat pouze své vlastní záznamy" }, { status: 403 });
    }

    await db.auditLog.deleteMany({ where: { recordId } });
    await db.record.delete({
      where: { id: recordId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete record error:", error);
    return NextResponse.json({ error: "Chyba při mazání záznamu" }, { status: 500 });
  }
}
