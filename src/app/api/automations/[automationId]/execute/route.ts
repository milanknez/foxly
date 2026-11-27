import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeAction, WorkflowAction } from "@/lib/workflow-engine";
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

    // Načteme dotčené záznamy
    const records = await db.record.findMany({
      where: {
        tableId: automation.tableId,
        ...(recordIds.length > 0 && { id: { in: recordIds } }),
      },
    });

    const actions = (Array.isArray(automation.actions) ? automation.actions : []) as unknown as WorkflowAction[];
    let successCount = 0;
    const allActionResults: any[] = [];
    let overallSuccess = true;

    for (const record of records) {
      const recordData = { ...((record.data || {}) as Record<string, unknown>) };

      for (const act of actions) {
        // Podpora obou formátů konfigurace pro UPDATE_FIELD
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

    // Záznam o spuštění workflow včetně akcí a příjemců pro zobrazení v logu
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
          recordIds: records.map((r) => r.id),
          actionsExecuted: allActionResults,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Workflow "${automation.name}" proběhlo úspěšně u ${records.length} záznamů.`,
      recordsAffected: records.length,
      actionsExecuted: allActionResults,
    });
  } catch (error) {
    console.error("POST /api/automations/[id]/execute error:", error);
    return NextResponse.json({ error: "Chyba při provádění workflow" }, { status: 500 });
  }
}
