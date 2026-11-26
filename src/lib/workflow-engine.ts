import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { sendEmail, SmtpConfig } from "@/lib/email-service";

export type TriggerType = "ON_CREATE" | "ON_FIELD_CHANGE" | "ON_UPDATE" | "MANUAL_BUTTON";

export interface TriggerConfig {
  fieldKey?: string;
  fromValue?: unknown;
  toValue?: unknown;
}

export type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "GREATER_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_OR_EQUAL"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY";

export interface ConditionRule {
  id: string;
  fieldKey: string;
  operator: ConditionOperator;
  value: unknown;
}

export type ActionType = "WEBHOOK" | "EMAIL" | "UPDATE_FIELD" | "SCRIPT";

export interface WebhookActionConfig {
  url: string;
  method?: "POST" | "GET" | "PUT";
  secretHeader?: string;
}

export interface EmailActionConfig {
  to: string;
  subject: string;
  body: string;
  attachmentFieldKey?: string; // Klíč sloupce s přílohami / URL (např. fld_files nebo fld_invoice)
}

export interface UpdateFieldActionConfig {
  targetFieldKey: string;
  targetValue: unknown;
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  config: WebhookActionConfig | EmailActionConfig | UpdateFieldActionConfig | Record<string, unknown>;
}

export interface ConditionEvalResult {
  rule: ConditionRule;
  fieldLabel: string;
  actualValue: unknown;
  passed: boolean;
  message: string;
}

// Nahrazení zástupných symbolů {{fld_xxx}} nebo {{label}} skutečnými hodnotami záznamu
export function replaceTemplateVariables(
  template: string,
  recordData: Record<string, unknown>,
  columns: Array<{ key: string; label: string }> = []
): string {
  if (!template) return "";

  let result = template;

  // Nahrazení podle klíčů polí {{fld_...}}
  for (const [key, val] of Object.entries(recordData)) {
    const strVal = val !== null && val !== undefined ? String(val) : "";
    result = result.replaceAll(`{{${key}}}`, strVal);
    result = result.replaceAll(`{${key}}`, strVal);
  }

  // Nahrazení podle názvů sloupců {{Dodavatel}}, {{Částka}}, atd.
  for (const col of columns) {
    const val = recordData[col.key];
    const strVal = val !== null && val !== undefined ? String(val) : "";
    result = result.replaceAll(`{{${col.label}}}`, strVal);
    result = result.replaceAll(`{${col.label}}`, strVal);
  }

  return result;
}

// Vyhodnocení jedné podmínky
export function evaluateSingleCondition(
  rule: ConditionRule,
  recordData: Record<string, unknown>,
  columns: Array<{ key: string; label: string }> = []
): ConditionEvalResult {
  const col = columns.find((c) => c.key === rule.fieldKey);
  const fieldLabel = col ? col.label : rule.fieldKey;
  const actualValue = recordData[rule.fieldKey];

  let passed = false;
  let message = "";

  const actualNum = Number(actualValue);
  const targetNum = Number(rule.value);
  const isNumeric =
    !isNaN(actualNum) &&
    !isNaN(targetNum) &&
    actualValue !== null &&
    actualValue !== "" &&
    rule.value !== null &&
    rule.value !== "";

  const strActual = actualValue !== null && actualValue !== undefined ? String(actualValue).trim().toLowerCase() : "";
  const strTarget = rule.value !== null && rule.value !== undefined ? String(rule.value).trim().toLowerCase() : "";

  switch (rule.operator) {
    case "EQUALS":
      passed = isNumeric ? actualNum === targetNum : strActual === strTarget;
      message = passed
        ? `${fieldLabel} odpovídá hodnotě "${rule.value}"`
        : `${fieldLabel} (${actualValue ?? "prázdné"}) neodpovídá "${rule.value}"`;
      break;

    case "NOT_EQUALS":
      passed = isNumeric ? actualNum !== targetNum : strActual !== strTarget;
      message = passed
        ? `${fieldLabel} je různé od "${rule.value}"`
        : `${fieldLabel} se rovná "${rule.value}"`;
      break;

    case "GREATER_THAN":
      passed = isNumeric ? actualNum > targetNum : strActual > strTarget;
      message = passed
        ? `${fieldLabel} (${actualValue}) > ${rule.value}`
        : `${fieldLabel} (${actualValue ?? 0}) není větší než ${rule.value}`;
      break;

    case "GREATER_OR_EQUAL":
      passed = isNumeric ? actualNum >= targetNum : strActual >= strTarget;
      message = passed
        ? `${fieldLabel} (${actualValue}) >= ${rule.value}`
        : `${fieldLabel} (${actualValue ?? 0}) je menší než ${rule.value}`;
      break;

    case "LESS_THAN":
      passed = isNumeric ? actualNum < targetNum : strActual < strTarget;
      message = passed
        ? `${fieldLabel} (${actualValue}) < ${rule.value}`
        : `${fieldLabel} (${actualValue ?? 0}) není menší než ${rule.value}`;
      break;

    case "LESS_OR_EQUAL":
      passed = isNumeric ? actualNum <= targetNum : strActual <= strTarget;
      message = passed
        ? `${fieldLabel} (${actualValue}) <= ${rule.value}`
        : `${fieldLabel} (${actualValue ?? 0}) je větší než ${rule.value}`;
      break;

    case "CONTAINS":
      passed = strActual.includes(strTarget);
      message = passed
        ? `${fieldLabel} obsahuje "${rule.value}"`
        : `${fieldLabel} neobsahuje "${rule.value}"`;
      break;

    case "NOT_CONTAINS":
      passed = !strActual.includes(strTarget);
      message = passed
        ? `${fieldLabel} neobsahuje "${rule.value}"`
        : `${fieldLabel} obsahuje "${rule.value}"`;
      break;

    case "IS_EMPTY":
      passed = actualValue === null || actualValue === undefined || actualValue === "";
      message = passed ? `${fieldLabel} je prázdné` : `${fieldLabel} není prázdné`;
      break;

    case "IS_NOT_EMPTY":
      passed = actualValue !== null && actualValue !== undefined && actualValue !== "";
      message = passed ? `${fieldLabel} je vyplněno` : `${fieldLabel} je prázdné`;
      break;

    default:
      passed = false;
      message = `Neznámý operátor podmínky: ${rule.operator}`;
  }

  return { rule, fieldLabel, actualValue, passed, message };
}

// Vyhodnocení pole podmínek (AND)
export function evaluateAllConditions(
  conditions: ConditionRule[],
  recordData: Record<string, unknown>,
  columns: Array<{ key: string; label: string }> = []
): { passed: boolean; details: ConditionEvalResult[] } {
  if (!conditions || conditions.length === 0) {
    return { passed: true, details: [] };
  }

  const details = conditions.map((rule) => evaluateSingleCondition(rule, recordData, columns));
  const passed = details.every((d) => d.passed);

  return { passed, details };
}

// Provedení jedné akce (Webhook, E-mail, Úprava pole)
export async function executeAction(
  action: WorkflowAction,
  context: {
    recordId: string;
    recordData: Record<string, unknown>;
    tableId: string;
    tableName: string;
    columns: Array<{ key: string; label: string; type?: string }>;
    visitedAutomationIds?: Set<string>;
    smtpConfig?: SmtpConfig;
  }
): Promise<{ status: "SUCCESS" | "FAILED"; message: string; details: unknown }> {
  const { recordId, recordData, tableId, tableName, columns, visitedAutomationIds, smtpConfig } = context;

  try {
    if (action.type === "WEBHOOK") {
      const config = action.config as WebhookActionConfig;
      if (!config.url) {
        return { status: "FAILED", message: "Chybí URL adresa webhooku", details: null };
      }

      const payload = {
        event: "FOXLY_AUTOMATION_TRIGGER",
        timestamp: new Date().toISOString(),
        table: { id: tableId, name: tableName },
        record: { id: recordId, data: recordData },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Foxly-Workflow-Engine/1.0",
      };
      if (config.secretHeader) {
        headers["X-Foxly-Secret"] = config.secretHeader;
      }

      const res = await fetch(config.url, {
        method: config.method || "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseText = await res.text().catch(() => "");
      if (res.ok) {
        return {
          status: "SUCCESS",
          message: `Webhook úspěšně odeslán (HTTP ${res.status})`,
          details: { status: res.status, url: config.url, responsePreview: responseText.slice(0, 300) },
        };
      } else {
        return {
          status: "FAILED",
          message: `Webhook vrátil chybu (HTTP ${res.status})`,
          details: { status: res.status, url: config.url, error: responseText.slice(0, 300) },
        };
      }
    }

    if (action.type === "EMAIL") {
      const config = action.config as EmailActionConfig;
      const to = replaceTemplateVariables(config.to || "admin@foxly.local", recordData, columns);
      const subject = replaceTemplateVariables(config.subject || "Notifikace z Foxly", recordData, columns);
      const body = replaceTemplateVariables(config.body || "Záznam byl aktualizován.", recordData, columns);

      // Přílohy ze sloupce (např. nahraný soubor, PDF, obrázek nebo URL)
      const attachments: Array<{ filename: string; path?: string; content?: string }> = [];
      if (config.attachmentFieldKey && recordData[config.attachmentFieldKey]) {
        const rawAttachment = recordData[config.attachmentFieldKey];
        const colDef = columns.find((c) => c.key === config.attachmentFieldKey);
        const colName = colDef?.label || "priloha";

        if (typeof rawAttachment === "string" && rawAttachment.trim()) {
          const urlOrPath = rawAttachment.trim();
          let filename = `${colName}`;
          try {
            const urlParts = new URL(urlOrPath, "http://localhost");
            const pathname = urlParts.pathname;
            const extractedName = pathname.substring(pathname.lastIndexOf("/") + 1);
            if (extractedName && extractedName.includes(".")) {
              filename = extractedName;
            } else {
              filename = `${colName}.pdf`;
            }
          } catch {
            filename = `${colName}.pdf`;
          }

          attachments.push({
            filename,
            path: urlOrPath,
          });
        }
      }

      // Odeslání přes email-service (Nodemailer SMTP nebo Mailpit fallback)
      const emailRes = await sendEmail({
        smtpConfig,
        to,
        subject,
        text: body,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e60f0; margin-top: 0;">${subject}</h2>
          <div style="background: #f8fafc; border-left: 4px solid #1e60f0; padding: 15px; margin: 15px 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${body}</div>
          ${attachments.length > 0 ? `<p style="font-size: 12px; color: #64748b;">📎 Přiložen soubor: <strong>${attachments[0].filename}</strong></p>` : ""}
          <p style="color: #94a3b8; font-size: 11px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            Automaticky vygenerováno systémem Foxly pro tabulku <strong>${tableName}</strong>.
          </p>
        </div>`,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (!emailRes.success) {
        return {
          status: "FAILED",
          message: `Odeslání e-mailu selhalo: ${emailRes.error || "Neznámá chyba"}`,
          details: { to, subject, error: emailRes.error },
        };
      }

      return {
        status: "SUCCESS",
        message: `E-mail "${subject}" odeslán příjemci ${to}${attachments.length > 0 ? ` (příloha: ${attachments[0].filename})` : ""}`,
        details: { to, subject, messageId: emailRes.messageId, attachmentsCount: attachments.length },
      };
    }

    if (action.type === "UPDATE_FIELD") {
      const config = action.config as UpdateFieldActionConfig;
      if (!config.targetFieldKey) {
        return { status: "FAILED", message: "Není vybráno cílové pole k aktualizaci", details: null };
      }

      const existingRecord = await db.record.findUnique({ where: { id: recordId } });
      if (!existingRecord) {
        return { status: "FAILED", message: "Záznam pro aktualizaci nenalezen", details: null };
      }

      const currentData = (existingRecord.data as Record<string, unknown>) || {};
      const updatedData = { ...currentData, [config.targetFieldKey]: config.targetValue };

      await db.record.update({
        where: { id: recordId },
        data: {
          data: updatedData as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      return {
        status: "SUCCESS",
        message: `Pole "${config.targetFieldKey}" nastaveno na "${config.targetValue}"`,
        details: { field: config.targetFieldKey, newValue: config.targetValue },
      };
    }

    if (action.type === "SCRIPT") {
      const config = action.config as { script?: string };
      if (!config.script) {
        return { status: "FAILED", message: "Chybí kód skriptu", details: null };
      }

      try {
        const fn = new Function("record", "table", "context", config.script);
        const result = fn(recordData, { id: tableId, name: tableName }, { recordId });

        if (result && typeof result === "object") {
          const existingRecord = await db.record.findUnique({ where: { id: recordId } });
          if (existingRecord) {
            const currentData = (existingRecord.data as Record<string, unknown>) || {};
            const updatedData = { ...currentData, ...result };
            await db.record.update({
              where: { id: recordId },
              data: {
                data: updatedData as unknown as Prisma.InputJsonValue,
                updatedAt: new Date(),
              },
            });
          }
        }

        return {
          status: "SUCCESS",
          message: "Uživatelský JavaScript skript byl úspěšně vykonán",
          details: { result },
        };
      } catch (scriptErr) {
        return {
          status: "FAILED",
          message: `Chyba při běhu skriptu: ${scriptErr instanceof Error ? scriptErr.message : String(scriptErr)}`,
          details: { error: String(scriptErr) },
        };
      }
    }

    return { status: "FAILED", message: `Neznámý typ akce: ${action.type}`, details: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { status: "FAILED", message: `Chyba při provádění akce: ${errorMsg}`, details: { error: errorMsg } };
  }
}

// Spuštění a vyhodnocení všech aktivních automatizací pro danou událost
export async function triggerAutomationsForEvent(params: {
  event: "CREATE" | "UPDATE";
  tableId: string;
  record: { id: string; data: Record<string, unknown>; [k: string]: unknown };
  previousRecord?: { id: string; data: Record<string, unknown>; [k: string]: unknown } | null;
  changedFieldKey?: string;
  visitedAutomationIds?: Set<string>;
}) {
  const { event, tableId, record, previousRecord, changedFieldKey, visitedAutomationIds = new Set<string>() } = params;

  try {
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        app: {
          include: {
            workspace: true,
          },
        },
        columns: { orderBy: { sortOrder: "asc" } },
        automations: { where: { isActive: true } },
      },
    });

    if (!table || table.automations.length === 0) {
      return [];
    }

    const companyDetails = (table.app?.workspace?.companyDetails as Record<string, any>) || {};
    const smtpConfig = companyDetails.smtp as SmtpConfig | undefined;

    const results = [];

    for (const automation of table.automations) {
      // Prevence nekonečných smyček
      if (visitedAutomationIds.has(automation.id)) {
        continue;
      }

      const triggerConfig = (automation.triggerConfig as TriggerConfig) || {};
      let isTriggered = false;
      let triggerReason = "";

      // 1. Kontrola spouštěče (Trigger)
      if (event === "CREATE" && automation.triggerType === "ON_CREATE") {
        isTriggered = true;
        triggerReason = "Nový záznam v tabulce";
      } else if (event === "UPDATE") {
        if (automation.triggerType === "ON_UPDATE") {
          isTriggered = true;
          triggerReason = "Aktualizace libovolného pole záznamu";
        } else if (automation.triggerType === "ON_FIELD_CHANGE") {
          const watchField = triggerConfig.fieldKey;
          if (watchField) {
            const oldVal = previousRecord ? (previousRecord.data as Record<string, unknown>)?.[watchField] : undefined;
            const newVal = record.data?.[watchField];

            // Došlo ke změně pole?
            if (oldVal !== newVal || changedFieldKey === watchField) {
              // Pokud je specifikována cílová hodnota toValue, musí odpovídat
              if (
                triggerConfig.toValue !== undefined &&
                triggerConfig.toValue !== null &&
                triggerConfig.toValue !== ""
              ) {
                if (String(newVal).toLowerCase() === String(triggerConfig.toValue).toLowerCase()) {
                  isTriggered = true;
                  triggerReason = `Pole ${watchField} změněno na "${triggerConfig.toValue}"`;
                }
              } else {
                isTriggered = true;
                triggerReason = `Pole ${watchField} bylo změněno`;
              }
            }
          }
        }
      }

      if (!isTriggered) {
        continue;
      }

      // 2. Vyhodnocení podmínek (Conditions)
      const rawConditions = (automation.conditions as unknown as ConditionRule[]) || [];
      const condEval = evaluateAllConditions(rawConditions, record.data, table.columns);

      if (!condEval.passed) {
        // Podmínky neprošly -> zaznamenáme log SKIPPED
        await db.automationLog.create({
          data: {
            automationId: automation.id,
            recordId: record.id,
            status: "SKIPPED",
            triggerEvent: `${event}: ${triggerReason}`,
            details: {
              reason: "Podmínky workflow nebyly splněny",
              evaluatedConditions: condEval.details,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        results.push({
          automationId: automation.id,
          name: automation.name,
          status: "SKIPPED" as const,
          message: "Podmínky nebyly splněny",
        });
        continue;
      }

      // 3. Provedení akcí (Actions)
      const nextVisited = new Set(visitedAutomationIds);
      nextVisited.add(automation.id);

      const rawActions = (automation.actions as unknown as WorkflowAction[]) || [];
      // Podpora pro jednoakční konfiguraci z actionType/actionConfig
      const actionsList: WorkflowAction[] =
        rawActions.length > 0
          ? rawActions
          : automation.actionType && automation.actionType !== "MULTI"
            ? [
                {
                  id: "act-1",
                  type: (automation.actionType === "SEND_WEBHOOK"
                    ? "WEBHOOK"
                    : automation.actionType === "SEND_EMAIL"
                      ? "EMAIL"
                      : "UPDATE_FIELD") as ActionType,
                  config: automation.actionConfig as Record<string, unknown>,
                },
              ]
            : [];

      const actionExecResults = [];
      let allActionsSuccess = true;

      for (const act of actionsList) {
        const res = await executeAction(act, {
          recordId: record.id,
          recordData: record.data,
          tableId: table.id,
          tableName: table.name,
          columns: table.columns,
          visitedAutomationIds: nextVisited,
          smtpConfig,
        });

        actionExecResults.push({ actionId: act.id, type: act.type, ...res });
        if (res.status === "FAILED") {
          allActionsSuccess = false;
        }
      }

      const overallStatus = allActionsSuccess ? "SUCCESS" : "FAILED";

      // Zápis do protokolu běhu (AutomationLog)
      await db.automationLog.create({
        data: {
          automationId: automation.id,
          recordId: record.id,
          status: overallStatus,
          triggerEvent: `${event}: ${triggerReason}`,
          details: {
            trigger: triggerReason,
            evaluatedConditions: condEval.details,
            actionsExecuted: actionExecResults,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      results.push({
        automationId: automation.id,
        name: automation.name,
        status: overallStatus as "SUCCESS" | "FAILED",
        message: allActionsSuccess ? "Všechny akce byly úspěšně provedeny" : "Některá z akcí selhala",
      });
    }

    return results;
  } catch (err) {
    console.error("Chyba při spouštění workflow automatizací:", err);
    return [];
  }
}

// Simulace a testovací běh automatizace na vybraném záznamu
export async function testAutomationRun(automationId: string, recordId: string) {
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
          columns: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!automation) {
    throw new Error("Automatizace nenalezena");
  }

  const companyDetails = (automation.table.app?.workspace?.companyDetails as Record<string, any>) || {};
  const smtpConfig = companyDetails.smtp as SmtpConfig | undefined;

  const record = await db.record.findUnique({
    where: { id: recordId },
  });

  if (!record || record.tableId !== automation.tableId) {
    throw new Error("Záznam pro testování nenalezen v tabulce této automatizace");
  }

  const recordData = (record.data as Record<string, unknown>) || {};
  const columns = automation.table.columns;

  // 1. Vyhodnocení spouštěče
  let triggerMatched = true;
  let triggerExplanation = "Spouštěč: Vybrán pro testovací běh";

  if (automation.triggerType === "ON_FIELD_CHANGE") {
    const triggerConfig = (automation.triggerConfig as TriggerConfig) || {};
    const fieldVal = recordData[triggerConfig.fieldKey || ""];
    if (triggerConfig.toValue !== undefined && triggerConfig.toValue !== null && triggerConfig.toValue !== "") {
      const isMatch = String(fieldVal).toLowerCase() === String(triggerConfig.toValue).toLowerCase();
      triggerExplanation = isMatch
        ? `Pole ${triggerConfig.fieldKey} má hodnotu "${fieldVal}", což odpovídá podmínce spouštěče "${triggerConfig.toValue}".`
        : `Pole ${triggerConfig.fieldKey} má hodnotu "${fieldVal ?? "prázdné"}", spouštěč vyžaduje "${triggerConfig.toValue}".`;
      triggerMatched = isMatch;
    } else {
      triggerExplanation = `Spouštěč sleduje změnu pole ${triggerConfig.fieldKey || "(libovolné)"}.`;
    }
  }

  // 2. Vyhodnocení podmínek
  const rawConditions = (automation.conditions as unknown as ConditionRule[]) || [];
  const condEval = evaluateAllConditions(rawConditions, recordData, columns);

  // 3. Spuštění akcí
  const rawActions = (automation.actions as unknown as WorkflowAction[]) || [];
  const actionExecResults = [];
  let allActionsSuccess = true;

  if (condEval.passed) {
    for (const act of rawActions) {
      const res = await executeAction(act, {
        recordId: record.id,
        recordData,
        tableId: automation.table.id,
        tableName: automation.table.name,
        columns,
        smtpConfig,
      });
      actionExecResults.push({ actionId: act.id, type: act.type, ...res });
      if (res.status === "FAILED") allActionsSuccess = false;
    }
  }

  const finalStatus = !condEval.passed ? "SKIPPED" : allActionsSuccess ? "SUCCESS" : "FAILED";

  // Zaznamenáme i testovací log
  await db.automationLog.create({
    data: {
      automationId: automation.id,
      recordId: record.id,
      status: finalStatus,
      triggerEvent: "MANUAL_TEST: Ruční testování uživatelem",
      details: {
        isTest: true,
        trigger: triggerExplanation,
        evaluatedConditions: condEval.details,
        actionsExecuted: actionExecResults,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    success: finalStatus === "SUCCESS",
    status: finalStatus,
    trigger: {
      matched: triggerMatched,
      explanation: triggerExplanation,
    },
    conditions: condEval,
    actions: actionExecResults,
  };
}
