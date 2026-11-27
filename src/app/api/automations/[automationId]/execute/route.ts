import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeAction, evaluateAllConditions, WorkflowAction, ConditionRule } from "@/lib/workflow-engine";
import { SmtpConfig } from "@/lib/email-service";
import { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { automationId } = await params;
    const body = await req.json().catch(() => ({}));
    const recordIds: string[] = Array.isArray(body.recordIds) ? body.recordIds : [];

    // Pokud uživatel nic nevybral, tlačítko má být zakázáno a backend nepovolí spuštění
    if (recordIds.length === 0) {
      return NextResponse.json(
        { error: "Nebyly vybrány žádné řádky v tabulce. Nejprve zaškrtněte alespoň jeden řádek." },
        { status: 400 }
      );
    }

    const automation = await db.automation.findUnique({
      where: { id: automationId },
      include: {
        table: {
          include: {
            app: {
              include: {
                workspace: true,
              },
            },
            columns: true,
          },
        },
      },
    });

    if (!automation) {
      return NextResponse.json({ error: "Automatizace nenalezena" }, { status: 404 });
    }

    // Načteme SMTP konfiguraci firmy z workspace
    const companyDetails = (automation.table.app?.workspace?.companyDetails as Record<string, any>) || {};
    const smtpConfig = companyDetails.smtp as SmtpConfig | undefined;

    // Načteme dotčené vybrané záznamy
    const records = await db.record.findMany({
      where: {
        tableId: automation.tableId,
        id: { in: recordIds },
      },
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: "Vybrané záznamy nebyly v tabulce nalezeny." },
        { status: 404 }
      );
    }

    const rawConditions = (Array.isArray(automation.conditions) ? automation.conditions : []) as unknown as ConditionRule[];
    const condColumns = automation.table.columns.map((c) => ({ key: c.key, label: c.label }));
    const actions = (Array.isArray(automation.actions) ? automation.actions : []) as unknown as WorkflowAction[];

    let successCount = 0;
    let skippedCount = 0;
    const allActionResults: any[] = [];
    let overallSuccess = true;

    for (const record of records) {
      const recordData = { ...((record.data || {}) as Record<string, unknown>) };

      // 1. Ověření podmínek workflow: pokud podmínky nejsou true, akce se nesmí provést!
      const condEval = evaluateAllConditions(rawConditions, recordData, condColumns);

      if (!condEval.passed) {
        skippedCount++;
        // Záznam o přeskočení záznamu kvůli nesplnění podmínek
        await db.automationLog.create({
          data: {
            automationId: automation.id,
            recordId: record.id,
            triggerEvent: "MANUAL_BUTTON_CLICK",
            status: "SKIPPED",
            details: {
              executedBy: session.email,
              reason: "Podmínky workflow nebyly splněny",
              evaluatedConditions: condEval.details,
            } as unknown as Prisma.InputJsonValue,
          },
        });
        continue;
      }

      // 2. Provedení akcí pouze při splnění podmínek
      for (const act of actions) {
        const cfg = (act.config || {}) as Record<string, unknown>;
        const normalizedAction: WorkflowAction = {
          ...act,
          config: {
            ...cfg,
            targetFieldKey: (cfg.targetFieldKey || cfg.fieldKey) as string,
            targetValue: cfg.targetValue !== undefined ? cfg.targetValue : cfg.value,
          },
        };

        const res = await executeAction(normalizedAction, {
          recordId: record.id,
          recordData,
          tableId: automation.tableId,
          tableName: automation.table.name,
          columns: automation.table.columns.map((c) => ({ key: c.key, label: c.label })),
          smtpConfig,
        });

        allActionResults.push({ actionId: act.id, type: act.type, ...res });
        if (res.status === "FAILED") {
          overallSuccess = false;
        }
      }

      await db.auditLog.create({
        data: {
          recordId: record.id,
          userId: session.id,
          action: "AUTOMATION_EXECUTE",
          changes: { automationName: automation.name, actionsApplied: actions.map((a) => a.type) },
        },
      });

      successCount++;
    }

    // Pokud byly všechny vybrané záznamy přeskočeny kvůli nesplněným podmínkám
    if (successCount === 0 && skippedCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Workflow "${automation.name}" nebylo spuštěno: podmínky pravidla nebyly u vybraných záznamů splněny.`,
        recordsAffected: records.length,
        successCount: 0,
        skippedCount,
      });
    }

    // Záznam o úspěšném spuštění workflow včetně akcí a příjemců
    if (successCount > 0) {
      await db.automationLog.create({
        data: {
          automationId: automation.id,
          recordId: records[0]?.id || null,
          triggerEvent: "MANUAL_BUTTON_CLICK",
          status: overallSuccess ? "SUCCESS" : "FAILED",
          details: {
            executedBy: session.email,
            recordsAffected: records.length,
            successCount,
            skippedCount,
            recordIds: records.map((r) => r.id),
            actionsExecuted: allActionResults,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Workflow "${automation.name}" proběhlo úspěšně u ${successCount} záznamů${skippedCount > 0 ? ` (${skippedCount} přeskočeno pro nesplnění podmínek)` : ""}.`,
      recordsAffected: records.length,
      successCount,
      skippedCount,
      actionsExecuted: allActionResults,
    });
  } catch (error) {
    console.error("POST /api/automations/[id]/execute error:", error);
    return NextResponse.json({ error: "Chyba při provádění workflow" }, { status: 500 });
  }
}
