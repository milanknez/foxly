"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Filter,
  Send,
  Plus,
  Trash2,
  Check,
  X,
  Play,
  RotateCcw,
  Clock,
  ArrowRight,
  Globe,
  Mail,
  Edit3,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowLeft,
  ChevronDown,
  Code2,
} from "lucide-react";
import SelectBadge, { SelectOption } from "@/components/select-badge";
import { useDialog } from "@/components/ui/dialog-provider";

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
}

interface RecordItem {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface ExecutionLog {
  id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  triggerEvent: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AutomationItem {
  id: string;
  tableId: string;
  name: string;
  description: string | null;
  triggerType: "ON_CREATE" | "ON_FIELD_CHANGE" | "ON_UPDATE" | "MANUAL_BUTTON";
  triggerConfig: {
    fieldKey?: string;
    fromValue?: unknown;
    toValue?: unknown;
    buttonLabel?: string;
    buttonColor?: string;
  };
  conditions: Array<{
    id: string;
    fieldKey: string;
    operator: string;
    value: unknown;
  }>;
  actions: Array<{
    id: string;
    type: "WEBHOOK" | "EMAIL" | "UPDATE_FIELD" | "SCRIPT";
    config: Record<string, unknown>;
  }>;
  isActive: boolean;
  createdAt: string;
  executionLogs: ExecutionLog[];
}

interface TableWithData {
  id: string;
  name: string;
  columns: Column[];
  records: RecordItem[];
  automations: AutomationItem[];
}

interface AppData {
  id: string;
  name: string;
  tables: TableWithData[];
}

interface WorkflowsClientProps {
  app: AppData;
  workspaceSlug: string;
  userRole: string;
}

export default function WorkflowsClient({
  app,
  workspaceSlug,
  userRole,
}: WorkflowsClientProps) {
  const router = useRouter();
  const { confirm, alert } = useDialog();

  // Vybraná tabulka
  const [selectedTableId, setSelectedTableId] = useState<string>(
    app.tables[0]?.id || ""
  );
  const currentTable =
    app.tables.find((t) => t.id === selectedTableId) || app.tables[0];

  const [activeTab, setActiveTab] = useState<"LIST" | "BUILDER" | "LOGS">("LIST");
  const [loading, setLoading] = useState(false);

  // Stav editoru pravidla
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"ON_CREATE" | "ON_FIELD_CHANGE" | "ON_UPDATE" | "MANUAL_BUTTON">("ON_CREATE");
  const [triggerFieldKey, setTriggerFieldKey] = useState<string>("");
  const [triggerToValue, setTriggerToValue] = useState<string>("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonColor, setButtonColor] = useState("#059669");

  const [conditions, setConditions] = useState<
    Array<{ id: string; fieldKey: string; operator: string; value: string }>
  >([]);

  const [actions, setActions] = useState<
    Array<{
      id: string;
      type: "WEBHOOK" | "EMAIL" | "UPDATE_FIELD" | "SCRIPT";
      config: Record<string, unknown>;
    }>
  >([]);

  // Testovací modál
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingAutomation, setTestingAutomation] = useState<AutomationItem | null>(null);
  const [testRecordId, setTestRecordId] = useState<string>("");
  const [testingLoading, setTestingLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);

  // Otevření editoru pro nové pravidlo
  const handleNewRule = () => {
    setEditingId(null);
    setRuleName("Nové workflow pravidlo");
    setRuleDescription("");
    setTriggerType("ON_CREATE");
    setTriggerFieldKey(currentTable?.columns[0]?.key || "");
    setTriggerToValue("");
    setButtonLabel("");
    setButtonColor("#059669");
    setConditions([]);
    setActions([
      {
        id: "act-" + Date.now(),
        type: "EMAIL",
        config: {
          to: "admin@foxly.local",
          subject: "Upozornění na novou fakturu {{fld_inv_num}}",
          body: "Dobrý den,\nbyla zaevidována nová faktura od {{fld_supplier}} na částku {{fld_amount}} Kč.\nSplatnost: {{fld_due_date}}",
        },
      },
    ]);
    setActiveTab("BUILDER");
  };

  // Načtení šablony z diagramu uživatele
  const handleLoadDiagramTemplate = () => {
    setEditingId(null);
    setRuleName("Schvalování velkých faktur nad 10 000 Kč (Diagram)");
    setRuleDescription("Při vytvoření faktury s částkou > 10 000 Kč a stavem K úhradě odešle Webhook do Make/Zapieru a notifikaci na e-mail.");
    setTriggerType("ON_CREATE");
    setTriggerFieldKey("fld_status");
    setTriggerToValue("");

    // Hledáme sloupce odpovídající částce a stavu
    const amountCol = currentTable?.columns.find((c) => c.key === "fld_amount" || c.type === "CURRENCY" || c.type === "NUMBER");
    const statusCol = currentTable?.columns.find((c) => c.key === "fld_status" || c.type === "SELECT");

    setConditions([
      {
        id: "cond-1",
        fieldKey: amountCol ? amountCol.key : "fld_amount",
        operator: "GREATER_THAN",
        value: "10000",
      },
      {
        id: "cond-2",
        fieldKey: statusCol ? statusCol.key : "fld_status",
        operator: "EQUALS",
        value: "K úhradě",
      },
    ]);

    setActions([
      {
        id: "act-webhook",
        type: "WEBHOOK",
        config: {
          url: "https://hook.eu1.make.com/demo-foxly-webhook",
          method: "POST",
          secretHeader: "",
        },
      },
      {
        id: "act-email",
        type: "EMAIL",
        config: {
          to: "admin@foxly.local",
          subject: "Faktura {{fld_inv_num}} vyžaduje schválení (Částka: {{fld_amount}} Kč)",
          body: "Byla vložena faktura od dodavatele {{fld_supplier}} přesahující limit 10 000 Kč.\nČástka: {{fld_amount}} Kč\nVariabilní symbol: {{fld_vs}}\nStav: {{fld_status}}",
        },
      },
      {
        id: "act-update",
        type: "UPDATE_FIELD",
        config: {
          targetFieldKey: statusCol ? statusCol.key : "fld_status",
          targetValue: "Ke schválení",
        },
      },
    ]);

    setActiveTab("BUILDER");
  };

  // Editace existujícího pravidla
  const handleEditRule = (automation: AutomationItem) => {
    setEditingId(automation.id);
    setRuleName(automation.name);
    setRuleDescription(automation.description || "");
    setTriggerType(automation.triggerType);
    setTriggerFieldKey(automation.triggerConfig?.fieldKey || currentTable?.columns[0]?.key || "");
    setTriggerToValue(String(automation.triggerConfig?.toValue || ""));
    setButtonLabel(String(automation.triggerConfig?.buttonLabel || automation.name));
    setButtonColor(String(automation.triggerConfig?.buttonColor || "#059669"));
    setConditions(
      (automation.conditions || []).map((c) => ({
        id: c.id || "cond-" + Math.random(),
        fieldKey: c.fieldKey,
        operator: c.operator,
        value: String(c.value ?? ""),
      }))
    );
    setActions(
      (automation.actions || []).map((a) => ({
        id: a.id || "act-" + Math.random(),
        type: a.type,
        config: a.config || {},
      }))
    );
    setActiveTab("BUILDER");
  };

  // Přidání podmínky
  const handleAddCondition = () => {
    const defaultCol = currentTable?.columns[0]?.key || "fld_amount";
    setConditions((prev) => [
      ...prev,
      {
        id: "cond-" + Date.now(),
        fieldKey: defaultCol,
        operator: "EQUALS",
        value: "",
      },
    ]);
  };

  // Přidání akce
  const handleAddAction = (type: "WEBHOOK" | "EMAIL" | "UPDATE_FIELD" | "SCRIPT") => {
    const newAct = {
      id: "act-" + Date.now(),
      type,
      config:
        type === "WEBHOOK"
          ? { url: "https://hook.eu1.make.com/demo-foxly", method: "POST" }
          : type === "EMAIL"
            ? { to: "admin@foxly.local", subject: "Notifikace z Foxly: {{fld_inv_num}}", body: "Záznam byl změněn: {{fld_supplier}}" }
            : type === "SCRIPT"
              ? { script: "// record obsahuje data vybraného řádku\n// Např. nastavit pole a vrátit změny:\nreturn { fld_status: \"Schváleno\" };" }
              : { targetFieldKey: currentTable?.columns[0]?.key || "", targetValue: "Uhrazeno" },
    };
    setActions((prev) => [...prev, newAct]);
  };

  // Uložení pravidla (POST nebo PATCH)
  const handleSaveRule = async () => {
    if (!ruleName.trim()) {
      await alert("Zadejte název workflow pravidla.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: ruleName,
        description: ruleDescription,
        triggerType,
        triggerConfig: {
          fieldKey: triggerType === "ON_FIELD_CHANGE" ? triggerFieldKey : undefined,
          toValue: triggerType === "ON_FIELD_CHANGE" && triggerToValue ? triggerToValue : undefined,
          buttonLabel: triggerType === "MANUAL_BUTTON" ? (buttonLabel || ruleName) : undefined,
          buttonColor: triggerType === "MANUAL_BUTTON" ? (buttonColor || "#059669") : undefined,
        },
        conditions,
        actions,
        isActive: true,
      };

      const url = editingId
        ? `/api/automations/${editingId}`
        : `/api/tables/${currentTable.id}/automations`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Uložení selhalo");
      }

      router.refresh();
      setActiveTab("LIST");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Chyba při ukládání");
    } finally {
      setLoading(false);
    }
  };

  // Přepnutí stavu aktivní/neaktivní
  const handleToggleActive = async (automation: AutomationItem) => {
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !automation.isActive }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Smazání pravidla
  const handleDeleteRule = async (automationId: string) => {
    const isConfirmed = await confirm({
      title: "Smazat workflow pravidlo?",
      message: "Opravdu chcete smazat toto automatizační pravidlo? Akce již nebude prováděna.",
      confirmText: "Smazat pravidlo",
      variant: "danger",
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Otevření testovacího okna
  const handleOpenTestModal = (automation: AutomationItem) => {
    setTestingAutomation(automation);
    setTestRecordId(currentTable?.records[0]?.id || "");
    setTestResult(null);
    setTestModalOpen(true);
  };

  // Spuštění testu
  const handleRunTest = async () => {
    if (!testingAutomation || !testRecordId) {
      await alert("Vyberte záznam pro testování.");
      return;
    }
    try {
      setTestingLoading(true);
      setTestResult(null);
      const res = await fetch(`/api/automations/${testingAutomation.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: testRecordId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chyba při testování");
      }
      setTestResult(data.result);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Test selhal");
    } finally {
      setTestingLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* 1. HORNÍ LIŠTA WORKFLOW AUTOMATIZACE */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            <Zap className="w-5 h-5 fill-amber-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Workflow
              </h1>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                Pravidla &amp; Akce
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Automatizujte procesy, webhooks do Make/Zapier, e-maily a aktualizace polí dle diagramu
            </p>
          </div>
        </div>

        {/* Přepínač tabulek v aplikaci */}
        <div className="flex items-center gap-2">
          {app.tables.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 px-1 font-semibold">Tabulka:</span>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 outline-none cursor-pointer"
              >
                {app.tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "LIST" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadDiagramTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-xs cursor-pointer"
                title="Vloží hotové pravidlo z diagramu uživatele"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pravidlo z diagramu</span>
              </button>

              <button
                onClick={handleNewRule}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1e60f0] hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nové pravidlo</span>
              </button>
            </div>
          )}

          {activeTab === "BUILDER" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("LIST")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zpět na přehled</span>
              </button>

              <button
                onClick={handleSaveRule}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? "Ukládám..." : "Uložit pravidlo"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. PŘEPÍNAČ ZÁLOŽEK */}
      <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab("LIST")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "LIST"
              ? "border-[#1e60f0] text-[#1e60f0] font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <span>Aktivní pravidla ({currentTable?.automations.length || 0})</span>
        </button>

        <button
          onClick={handleNewRule}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "BUILDER"
              ? "border-[#1e60f0] text-[#1e60f0] font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{editingId ? "Úprava pravidla" : "Vizuální editor (Node Flow)"}</span>
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "LOGS"
              ? "border-[#1e60f0] text-[#1e60f0] font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Historie spuštění (Logy)</span>
        </button>
      </div>

      {/* 3. HLAVNÍ OBSAH DLE ZÁLOŽKY */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* A. SEZNAM PRAVIDEL (LIST) */}
        {activeTab === "LIST" && (
          <div className="space-y-4">
            {(!currentTable?.automations || currentTable.automations.length === 0) ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mx-auto">
                  <Zap className="w-8 h-8 fill-amber-500/20" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Zatím nemáte vytvořené žádné automatizační workflow
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Vytvořte si pravidla dle schématu: Spouštěč (např. nový záznam nebo změna pole) ➔ Podmínky (např. Částka &gt; 10 000 Kč) ➔ Akce (Webhook, E-mail, úprava pole).
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleLoadDiagramTemplate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Načíst pravidlo z diagramu</span>
                  </button>
                  <button
                    onClick={handleNewRule}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Vytvořit vlastní pravidlo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentTable.automations.map((rule) => {
                  const lastLog = rule.executionLogs?.[0];

                  return (
                    <div
                      key={rule.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              rule.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                            }`}
                          />
                          <h4 className="font-bold text-sm text-slate-900">{rule.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {rule.triggerType === "ON_CREATE"
                              ? "⚡ Nový záznam"
                              : rule.triggerType === "ON_FIELD_CHANGE"
                                ? `🔄 Změna pole (${rule.triggerConfig?.fieldKey || "pole"})`
                                : "✏️ Úprava záznamu"}
                          </span>
                        </div>

                        {rule.description && (
                          <p className="text-xs text-slate-500">{rule.description}</p>
                        )}

                        {/* Náhled uzlů Flow */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-1">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-600" />
                            {rule.triggerType === "ON_CREATE" ? "Nový záznam" : "Změna pole"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Filter className="w-3 h-3 text-blue-600" />
                            {rule.conditions?.length || 0} podmínek
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Send className="w-3 h-3 text-emerald-600" />
                            {rule.actions?.length || 0} akcí
                          </span>

                          {lastLog && (
                            <span
                              className={`ml-3 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                lastLog.status === "SUCCESS"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : lastLog.status === "SKIPPED"
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              Poslední běh: {lastLog.status === "SUCCESS" ? "Úspěch" : lastLog.status === "SKIPPED" ? "Podmínky nesplněny" : "Chyba"} (
                              {new Date(lastLog.createdAt).toLocaleTimeString("cs-CZ", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              )
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tlačítka akcí pro pravidlo */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            rule.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {rule.isActive ? "Aktivní" : "Pozastaveno"}
                        </button>

                        <button
                          onClick={() => handleOpenTestModal(rule)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Spustit test na reálném záznamu"
                        >
                          <Play className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
                          <span>Otestovat</span>
                        </button>

                        <button
                          onClick={() => handleEditRule(rule)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Upravit pravidlo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          title="Smazat pravidlo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* B. VIZUÁLNÍ EDITOR (BUILDER: SPOUŠTĚČ -> PODMÍNKY -> AKCE) */}
        {activeTab === "BUILDER" && (
          <div className="space-y-8">
            {/* Základní informace o pravidle */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Název pravidla *
                  </label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="Např. Notifikace schválení velkých faktur"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Popis pravidla (volitelné)
                  </label>
                  <input
                    type="text"
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    placeholder="Např. Odeslat e-mail účetní a POST webhook do Make"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* VIZUÁLNÍ FLOW DIAGRAM PODLE UŽIVATELSKÉHO SCREENSHOTU */}
            <div className="space-y-6">
              {/* UZEL 1: SPOUŠTĚČ (TRIGGER) */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                      1
                    </span>
                    <h3 className="font-bold text-sm tracking-wide">
                      Spouštěč (Trigger)
                    </h3>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">
                    Kdy se pravidlo aktivuje
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      onClick={() => setTriggerType("ON_CREATE")}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        triggerType === "ON_CREATE"
                          ? "border-amber-500 bg-amber-50/50 text-amber-950 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={triggerType === "ON_CREATE"}
                        onChange={() => setTriggerType("ON_CREATE")}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          <span>Nový záznam v tabulce</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Ruční vložení, OCR vytěžení z PDF/obrázku nebo přes veřejný formulář
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setTriggerType("ON_FIELD_CHANGE")}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        triggerType === "ON_FIELD_CHANGE"
                          ? "border-amber-500 bg-amber-50/50 text-amber-950 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={triggerType === "ON_FIELD_CHANGE"}
                        onChange={() => setTriggerType("ON_FIELD_CHANGE")}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Změna konkrétního pole</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Při změně vybraného pole (např. Stav = &quot;Uhrazeno&quot;)
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setTriggerType("MANUAL_BUTTON")}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        triggerType === "MANUAL_BUTTON"
                          ? "border-amber-500 bg-amber-50/50 text-amber-950 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={triggerType === "MANUAL_BUTTON"}
                        onChange={() => setTriggerType("MANUAL_BUTTON")}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 text-amber-600" />
                          <span>Vlastní tlačítko nad tabulkou</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Barevné tlačítko v liště tabulky spouštějící workflow pro označené řádky
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Konfigurace pro MANUAL_BUTTON */}
                  {triggerType === "MANUAL_BUTTON" && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Popisek tlačítka v tabulce *
                        </label>
                        <input
                          type="text"
                          value={buttonLabel}
                          onChange={(e) => setButtonLabel(e.target.value)}
                          placeholder={ruleName || "např. Schválit platbu"}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Pokud nevyplníte, použije se název workflow pravidla.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Barva tlačítka
                        </label>
                        <div className="flex items-center gap-2">
                          {[
                            { color: "#059669", label: "Zelená" },
                            { color: "#2563eb", label: "Modrá" },
                            { color: "#7c3aed", label: "Fialová" },
                            { color: "#d97706", label: "Oranžová" },
                            { color: "#dc2626", label: "Červená" },
                            { color: "#1e293b", label: "Tmavá" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setButtonColor(c.color)}
                              className={`w-7 h-7 rounded-lg transition-transform cursor-pointer ${
                                buttonColor === c.color ? "ring-2 ring-slate-900 ring-offset-2 scale-110" : "hover:scale-105"
                              }`}
                              style={{ backgroundColor: c.color }}
                              title={c.label}
                            />
                          ))}
                        </div>

                        {/* Náhled tlačítka */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">Náhled:</span>
                          <span
                            className="px-2.5 py-1 rounded-lg text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs"
                            style={{ backgroundColor: buttonColor }}
                          >
                            <Zap className="w-3 h-3" />
                            {buttonLabel.trim() || ruleName || "Vlastní akce"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Konfigurace pro ON_FIELD_CHANGE */}
                  {triggerType === "ON_FIELD_CHANGE" && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">
                          Sledované pole:
                        </label>
                        <select
                          value={triggerFieldKey}
                          onChange={(e) => setTriggerFieldKey(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        >
                          {currentTable?.columns.map((c) => (
                            <option key={c.id} value={c.key}>
                              {c.label} ({c.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">
                          Nová hodnota pole (volitelné):
                        </label>
                        <input
                          type="text"
                          value={triggerToValue}
                          onChange={(e) => setTriggerToValue(e.target.value)}
                          placeholder="Např. Uhrazeno (nechte prázdné pro jakoukoliv změnu)"
                          className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ŠIPKA MEZI UZLY */}
              <div className="flex justify-center -my-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 shadow-xs">
                  <ChevronDown className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* UZEL 2: PODMÍNKY (CONDITIONS) */}
              <div className="bg-white rounded-2xl border-2 border-blue-300 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                      2
                    </span>
                    <h3 className="font-bold text-sm tracking-wide">
                      Podmínky (Conditions)
                    </h3>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">
                    Filtry (všechny musí platit: AND)
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {conditions.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        Žádné podmínky nejsou nastaveny. Pravidlo se spustí pro <strong>všechny záznamy</strong>.
                      </p>
                      <button
                        onClick={handleAddCondition}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Přidat podmínku (např. Částka &gt; 10 000 Kč)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conditions.map((cond, idx) => {
                        const col = currentTable?.columns.find((c) => c.key === cond.fieldKey);
                        const selectOpts: SelectOption[] =
                          col?.type === "SELECT" && Array.isArray(col?.config?.options)
                            ? (col.config.options as SelectOption[])
                            : [];

                        return (
                          <div
                            key={cond.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3"
                          >
                            <span className="text-xs font-bold text-slate-400 w-6 text-center">
                              #{idx + 1}
                            </span>

                            {/* Výběr pole */}
                            <select
                              value={cond.fieldKey}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                setConditions((prev) =>
                                  prev.map((c) => (c.id === cond.id ? { ...c, fieldKey: newKey } : c))
                                );
                              }}
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none w-full sm:w-48"
                            >
                              {currentTable?.columns.map((c) => (
                                <option key={c.id} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </select>

                            {/* Operátor */}
                            <select
                              value={cond.operator}
                              onChange={(e) => {
                                const newOp = e.target.value;
                                setConditions((prev) =>
                                  prev.map((c) => (c.id === cond.id ? { ...c, operator: newOp } : c))
                                );
                              }}
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-700 outline-none w-full sm:w-44"
                            >
                              <option value="EQUALS">== Rovná se</option>
                              <option value="NOT_EQUALS">!= Nerovná se</option>
                              <option value="GREATER_THAN">&gt; Větší než</option>
                              <option value="GREATER_OR_EQUAL">&gt;= Větší nebo rovno</option>
                              <option value="LESS_THAN">&lt; Menší než</option>
                              <option value="LESS_OR_EQUAL">&lt;= Menší nebo rovno</option>
                              <option value="CONTAINS">Obsahuje text</option>
                              <option value="NOT_CONTAINS">Neobsahuje text</option>
                              <option value="IS_EMPTY">Je prázdné</option>
                              <option value="IS_NOT_EMPTY">Je vyplněno</option>
                            </select>

                            {/* Hodnota */}
                            {cond.operator !== "IS_EMPTY" && cond.operator !== "IS_NOT_EMPTY" && (
                              <div className="flex-1 w-full flex items-center gap-2">
                                {selectOpts.length > 0 ? (
                                  <select
                                    value={cond.value}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setConditions((prev) =>
                                        prev.map((c) => (c.id === cond.id ? { ...c, value: newVal } : c))
                                      );
                                    }}
                                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none w-full"
                                  >
                                    <option value="">-- Vyberte stav --</option>
                                    {selectOpts.map((opt) => (
                                      <option key={opt.id} value={opt.label}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={cond.value}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setConditions((prev) =>
                                        prev.map((c) => (c.id === cond.id ? { ...c, value: newVal } : c))
                                      );
                                    }}
                                    placeholder="Zadejte hodnotu (např. 10000)"
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                                  />
                                )}
                              </div>
                            )}

                            {/* Smazat podmínku */}
                            <button
                              onClick={() =>
                                setConditions((prev) => prev.filter((c) => c.id !== cond.id))
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Smazat tuto podmínku"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      <button
                        onClick={handleAddCondition}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Přidat další podmínku</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ŠIPKA MEZI UZLY */}
              <div className="flex justify-center -my-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 shadow-xs">
                  <ChevronDown className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* UZEL 3: AKCE (ACTIONS) */}
              <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                      3
                    </span>
                    <h3 className="font-bold text-sm tracking-wide">
                      Akce (Actions)
                    </h3>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">
                    Co se má automaticky provést
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {actions.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        Zatím nemáte vybránu žádnou akci. Zvolte alespoň jednu akci z níže uvedených:
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {actions.map((act, idx) => (
                        <div
                          key={act.id}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                  act.type === "WEBHOOK"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : act.type === "EMAIL"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : act.type === "SCRIPT"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {act.type === "WEBHOOK" && <Globe className="w-3.5 h-3.5" />}
                                {act.type === "EMAIL" && <Mail className="w-3.5 h-3.5" />}
                                {act.type === "UPDATE_FIELD" && <Edit3 className="w-3.5 h-3.5" />}
                                {act.type === "SCRIPT" && <Code2 className="w-3.5 h-3.5" />}
                                <span>
                                  {act.type === "WEBHOOK"
                                    ? "Odeslat Webhook (Make / Zapier / Slack)"
                                    : act.type === "EMAIL"
                                      ? "Odeslat E-mail (notifikace na Mailpit/SMTP)"
                                      : act.type === "SCRIPT"
                                        ? "Spustit vlastní JavaScript kód"
                                        : "Automaticky aktualizovat jiné pole"}
                                </span>
                              </span>
                            </div>

                            <button
                              onClick={() => setActions((prev) => prev.filter((a) => a.id !== act.id))}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                              title="Odebrat tuto akci"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Formulář pro WEBHOOK */}
                          {act.type === "WEBHOOK" && (
                            <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                  Cílová Webhook URL adresa *
                                </label>
                                <input
                                  type="url"
                                  value={String(act.config.url || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActions((prev) =>
                                      prev.map((a) =>
                                        a.id === act.id
                                          ? { ...a, config: { ...a.config, url: val } }
                                          : a
                                      )
                                    );
                                  }}
                                  placeholder="https://hook.eu1.make.com/..."
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-800"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    HTTP Metoda
                                  </label>
                                  <select
                                    value={String(act.config.method || "POST")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setActions((prev) =>
                                        prev.map((a) =>
                                          a.id === act.id
                                            ? { ...a, config: { ...a.config, method: val } }
                                            : a
                                        )
                                      );
                                    }}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-bold"
                                  >
                                    <option value="POST">POST (výchozí s JSON payloadem)</option>
                                    <option value="PUT">PUT</option>
                                    <option value="GET">GET</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    Tajný token v hlavičce X-Foxly-Secret (volitelné)
                                  </label>
                                  <input
                                    type="text"
                                    value={String(act.config.secretHeader || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setActions((prev) =>
                                        prev.map((a) =>
                                          a.id === act.id
                                            ? { ...a, config: { ...a.config, secretHeader: val } }
                                            : a
                                        )
                                      );
                                    }}
                                    placeholder="Tajný klíč pro ověření"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Formulář pro E-MAIL */}
                          {act.type === "EMAIL" && (
                            <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    Příjemce notifikace (E-mail) *
                                  </label>
                                  <input
                                    type="text"
                                    value={String(act.config.to || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setActions((prev) =>
                                        prev.map((a) =>
                                          a.id === act.id
                                            ? { ...a, config: { ...a.config, to: val } }
                                            : a
                                        )
                                      );
                                    }}
                                    placeholder="admin@foxly.local nebo {{fld_email}}"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    Předmět zprávy *
                                  </label>
                                  <input
                                    type="text"
                                    value={String(act.config.subject || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setActions((prev) =>
                                        prev.map((a) =>
                                          a.id === act.id
                                            ? { ...a, config: { ...a.config, subject: val } }
                                            : a
                                        )
                                      );
                                    }}
                                    placeholder="Upozornění: Faktura {{fld_inv_num}}"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 font-semibold"
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="font-bold text-slate-700">
                                    Tělo e-mailu
                                  </label>
                                  <span className="text-[11px] text-slate-400">
                                    Můžete použít proměnné např. {"{{fld_supplier}}"} nebo {"{{Částka}}"}
                                  </span>
                                </div>
                                <textarea
                                  rows={3}
                                  value={String(act.config.body || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActions((prev) =>
                                      prev.map((a) =>
                                        a.id === act.id
                                          ? { ...a, config: { ...a.config, body: val } }
                                          : a
                                      )
                                    );
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-800 font-mono text-xs"
                                />
                              </div>

                              {/* Rychlé vložení proměnných sloupců */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] text-slate-400 font-semibold">Vložit proměnnou:</span>
                                {currentTable?.columns.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      const token = `{{${c.key}}}`;
                                      const currentBody = String(act.config.body || "");
                                      setActions((prev) =>
                                        prev.map((a) =>
                                          a.id === act.id
                                            ? { ...a, config: { ...a.config, body: currentBody + " " + token } }
                                            : a
                                        )
                                      );
                                    }}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 rounded text-[10px] text-slate-600 transition-colors cursor-pointer"
                                  >
                                    +{c.label}
                                  </button>
                                ))}
                              </div>

                              {/* Přílohy: Pevný soubor (např. stálý životopis) i dynamický soubor z řádku */}
                              <div className="pt-2 border-t border-slate-100 space-y-3">
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>📎 Pevná URL adresa přílohy (např. stálé CV / životopis)</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      Stálý odkaz na PDF – nemusíte nahrávat do řádků
                                    </span>
                                  </label>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      placeholder="https://domena.cz/zivotopis.pdf"
                                      value={String(act.config.staticAttachmentUrl || "")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setActions((prev) =>
                                          prev.map((a) =>
                                            a.id === act.id
                                              ? { ...a, config: { ...a.config, staticAttachmentUrl: val } }
                                              : a
                                          )
                                        );
                                      }}
                                      className="sm:col-span-2 px-3 py-1.5 border border-slate-300 rounded text-slate-800 bg-white text-xs font-mono"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Název: Zivotopis.pdf"
                                      value={String(act.config.staticAttachmentName || "")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setActions((prev) =>
                                          prev.map((a) =>
                                            a.id === act.id
                                              ? { ...a, config: { ...a.config, staticAttachmentName: val } }
                                              : a
                                          )
                                        );
                                      }}
                                      className="px-3 py-1.5 border border-slate-300 rounded text-slate-800 bg-white text-xs"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>📎 Nebo přiložit soubor ze sloupce tabulky</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      Ze sloupce daného řádku
                                    </span>
                                  </label>
                                  <select
                                    value={String(act.config.attachmentFieldKey || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setActions((prev) =>
                                        prev.map((a) =>
                                          a.id === act.id
                                            ? { ...a, config: { ...a.config, attachmentFieldKey: val } }
                                            : a
                                        )
                                      );
                                    }}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 bg-white text-xs"
                                  >
                                    <option value="">— Žádný sloupec nevybrán —</option>
                                    {currentTable?.columns
                                      .filter((c) => c.type === "FILE" || c.type === "IMAGE" || c.type === "URL" || c.type === "TEXT")
                                      .map((c) => (
                                        <option key={c.id} value={c.key}>
                                          {c.label} ({c.type})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Formulář pro UPDATE_FIELD */}
                          {act.type === "UPDATE_FIELD" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                  Cílové pole k aktualizaci *
                                </label>
                                <select
                                  value={String(act.config.targetFieldKey || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActions((prev) =>
                                      prev.map((a) =>
                                        a.id === act.id
                                          ? { ...a, config: { ...a.config, targetFieldKey: val } }
                                          : a
                                      )
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-semibold outline-none"
                                >
                                  {currentTable?.columns.map((c) => (
                                    <option key={c.id} value={c.key}>
                                      {c.label} ({c.type})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                  Nová hodnota pole *
                                </label>
                                <input
                                  type="text"
                                  value={String(act.config.targetValue || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActions((prev) =>
                                      prev.map((a) =>
                                        a.id === act.id
                                          ? { ...a, config: { ...a.config, targetValue: val } }
                                          : a
                                      )
                                    );
                                  }}
                                  placeholder="Např. Uhrazeno nebo Schváleno"
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 font-semibold outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* Formulář pro SCRIPT */}
                          {act.type === "SCRIPT" && (
                            <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                                  <span>Vlastní JavaScript kód *</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    Objekty: <code>record</code>, <code>table</code>, <code>context</code>
                                  </span>
                                </label>
                                <textarea
                                  rows={5}
                                  value={String(act.config.script || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActions((prev) =>
                                      prev.map((a) =>
                                        a.id === act.id
                                          ? { ...a, config: { ...a.config, script: val } }
                                          : a
                                      )
                                    );
                                  }}
                                  placeholder="// Napište JavaScript kód prováděný nad vybraným záznamem..."
                                  className="w-full px-3 py-2 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg border border-slate-700 outline-none leading-relaxed"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Tip: Pokud skript vrátí objekt <code>return &#123; fld_xxx: hodnota &#125;;</code>, daná pole záznamu se automaticky aktualizují v databázi.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tlačítka pro přidání akcí */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">+ Přidat akci:</span>
                    <button
                      onClick={() => handleAddAction("WEBHOOK")}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Webhook (Make/Zapier)</span>
                    </button>

                    <button
                      onClick={() => handleAddAction("EMAIL")}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>E-mail (Mailpit/SMTP)</span>
                    </button>

                    <button
                      onClick={() => handleAddAction("UPDATE_FIELD")}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Aktualizovat jiné pole</span>
                    </button>

                    <button
                      onClick={() => handleAddAction("SCRIPT")}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Vlastní skript (JavaScript)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SPODNÍ TLAČÍTKA ULOŽENÍ */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setActiveTab("LIST")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Zrušit
              </button>

              <button
                onClick={handleSaveRule}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? "Ukládám pravidlo..." : "Uložit a aktivovat workflow"}</span>
              </button>
            </div>
          </div>
        )}

        {/* C. HISTORIE SPUŠTĚNÍ (LOGS) */}
        {activeTab === "LOGS" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="font-bold text-sm text-slate-800">
                    Protokol spuštění workflow v této tabulce
                  </h3>
                </div>

                <a
                  href="http://localhost:8026"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Otevřít schránku Mailpit (Port 8026)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {currentTable?.automations.flatMap((a) => a.executionLogs).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  Zatím nebyl zaznamenán žádný běh automatizace. Spusťte test pravidla nebo vytvořte nový záznam.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {currentTable.automations
                    .flatMap((a) =>
                      a.executionLogs.map((l) => ({ ...l, automationName: a.name }))
                    )
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((log) => (
                      <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                log.status === "SUCCESS"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : log.status === "SKIPPED"
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {log.status === "SUCCESS"
                                ? "ÚSPĚCH"
                                : log.status === "SKIPPED"
                                  ? "PODMÍNKY NESPLNĚNY"
                                  : "CHYBA"}
                            </span>
                            <span className="font-bold text-slate-900">{log.automationName}</span>
                          </div>
                          <p className="text-slate-500">{log.triggerEvent}</p>
                        </div>

                        <div className="text-right sm:text-right shrink-0">
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleString("cs-CZ")}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. MODÁL PRO ŽIVÉ TESTOVÁNÍ PRAVIDLA */}
      {testModalOpen && testingAutomation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Play className="w-4 h-4 fill-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Otestovat workflow pravidlo
                  </h3>
                  <p className="text-[11px] text-slate-500">{testingAutomation.name}</p>
                </div>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Vyberte testovací záznam z tabulky:
              </label>
              <select
                value={testRecordId}
                onChange={(e) => setTestRecordId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              >
                {currentTable?.records.map((r) => {
                  const label =
                    r.data.fld_supplier ||
                    r.data.fld_inv_num ||
                    r.data.fld_name ||
                    `Záznam #${r.id.slice(0, 8)}`;
                  const amount = r.data.fld_amount ? ` (${r.data.fld_amount} Kč)` : "";
                  const status = r.data.fld_status ? ` - [${r.data.fld_status}]` : "";

                  return (
                    <option key={r.id} value={r.id}>
                      {String(label)}
                      {amount}
                      {status}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Výsledek diagnostického testu */}
            {testResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Diagnostika průchodu:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                      testResult.status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : testResult.status === "SKIPPED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {testResult.status === "SUCCESS"
                      ? "VŠECHNY KROKY SPLNĚNY (SUCCESS)"
                      : testResult.status === "SKIPPED"
                        ? "PODMÍNKA NEPROŠLA (SKIPPED)"
                        : "CHYBA PŘI PROVEDENÍ AKCÍ"}
                  </span>
                </div>

                {/* Vyhodnocení spouštěče */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">Spouštěč:</div>
                    <p className="text-slate-600">
                      {String((testResult.trigger as Record<string, unknown>)?.explanation || "")}
                    </p>
                  </div>
                </div>

                {/* Vyhodnocení podmínek */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                      2
                    </span>
                    <span className="font-bold text-slate-900">Vyhodnocení podmínek (AND):</span>
                  </div>

                  {Array.isArray((testResult.conditions as Record<string, unknown>)?.details) &&
                  ((testResult.conditions as Record<string, unknown>)?.details as Array<{ passed: boolean; message: string }>).length > 0 ? (
                    ((testResult.conditions as Record<string, unknown>)?.details as Array<{ passed: boolean; message: string }>).map(
                      (d, i) => (
                        <div key={i} className="flex items-center gap-2 pl-7">
                          {d.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          )}
                          <span className={d.passed ? "text-emerald-800" : "text-red-700"}>
                            {d.message}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-slate-500 pl-7">Žádné podmínky (pravidlo platí pro vše).</p>
                  )}
                </div>

                {/* Vyhodnocení akcí */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                      3
                    </span>
                    <span className="font-bold text-slate-900">Provedení akcí:</span>
                  </div>

                  {Array.isArray(testResult.actions) && testResult.actions.length > 0 ? (
                    (testResult.actions as Array<{ status: string; message: string; type: string }>).map(
                      (a, i) => (
                        <div key={i} className="flex items-center gap-2 pl-7">
                          {a.status === "SUCCESS" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          )}
                          <span className="font-bold text-slate-700">[{a.type}]:</span>
                          <span className={a.status === "SUCCESS" ? "text-emerald-800" : "text-red-700"}>
                            {a.message}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-slate-500 pl-7">Akce nebyly spuštěny (podmínky neprošly).</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Zavřít
              </button>

              <button
                onClick={handleRunTest}
                disabled={testingLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{testingLoading ? "Provádím test..." : "Spustit test na záznamu"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
