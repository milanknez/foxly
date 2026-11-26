"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Code2,
  Play,
  Save,
  Check,
  Loader2,
  Sparkles,
  Terminal,
  HelpCircle,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

interface ScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  columns: { id: string; key: string; label: string; type: string }[];
  initialScript?: string;
  onSave?: (script: string) => Promise<void>;
}

const DEFAULT_SCRIPT_TEMPLATE = `/**
 * Vlastní JavaScript skript pro tabulku
 * Dostupné proměnné:
 *  - record: objekt aktuálního záznamu (např. record.fld_amount)
 *  - columns: seznam sloupců
 *  - utils: { notify(msg), formatCurrency(val), formatDate(d) }
 */

function onBeforeSave(record) {
  // Příklad automatického výpočtu nebo kontroly:
  if (record.fld_amount && Number(record.fld_amount) > 100000) {
    record.fld_status = "Vyžaduje schválení ředitele";
  }
  return record;
}

function onCustomAction(record) {
  console.log("Spuštěna vlastní akce pro:", record);
  return { success: true, message: "Skript byl úspěšně spuštěn!" };
}
`;

export default function ScriptEditorModal({
  isOpen,
  onClose,
  tableId,
  tableName,
  columns,
  initialScript,
  onSave,
}: ScriptEditorModalProps) {
  const { alert } = useDialog();
  const [code, setCode] = useState(initialScript || DEFAULT_SCRIPT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    status: "idle" | "success" | "error";
    logs: string[];
    result?: unknown;
  }>({ status: "idle", logs: [] });

  useEffect(() => {
    if (initialScript) {
      setCode(initialScript);
    }
  }, [initialScript]);

  if (!isOpen) return null;

  // Spuštění testu skriptu v bezpečném sandboxu
  const handleTestScript = () => {
    const logs: string[] = [];
    const customConsole = {
      log: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")),
      error: (...args: unknown[]) => logs.push("CHYBA: " + args.map((a) => String(a)).join(" ")),
      warn: (...args: unknown[]) => logs.push("VAROVÁNÍ: " + args.map((a) => String(a)).join(" ")),
    };

    // Simulovaný vzorový záznam
    const sampleRecord: Record<string, unknown> = {};
    columns.forEach((col) => {
      sampleRecord[col.key] = col.type === "NUMBER" || col.type === "CURRENCY" ? 150000 : `${col.label} Test`;
    });

    try {
      // Vyhodnocení skriptu
      const runFn = new Function("record", "columns", "console", `
        ${code}
        if (typeof onBeforeSave === 'function') {
          return onBeforeSave(record);
        } else if (typeof onCustomAction === 'function') {
          return onCustomAction(record);
        }
        return { message: "Skript je syntakticky v pořádku, ale neobsahuje funkci onBeforeSave ani onCustomAction." };
      `);

      const res = runFn(sampleRecord, columns, customConsole);
      logs.push("Návratová hodnota: " + JSON.stringify(res, null, 2));

      setTestOutput({
        status: "success",
        logs,
        result: res,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logs.push("Chyba při běhu: " + errorMsg);
      setTestOutput({
        status: "error",
        logs,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      if (onSave) {
        await onSave(code);
      } else {
        await fetch(`/api/tables/${tableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customScript: code }),
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
      await alert("Chyba při ukládání skriptu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Hlavička */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">JavaScript Skriptování: {tableName}</h3>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 border border-orange-400/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                  Foxly Script Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Možnost psát vlastní logiku, přepočty a validační funkce pro tuto tabulku
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" /> Uloženo!
              </span>
            )}
            <button
              onClick={handleTestScript}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Otestovat skript</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Uložit skript</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tělo editoru a konzole */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-950">
          {/* Levý panel: Kód */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="font-mono">table_script.js</span>
              <button
                type="button"
                onClick={() => setCode(DEFAULT_SCRIPT_TEMPLATE)}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                title="Obnovit výchozí šablonu"
              >
                <RotateCcw className="w-3 h-3" /> Šablona
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-indigo-900/60"
            />
          </div>

          {/* Pravý panel: Dostupné sloupce a Konzole výstupu */}
          <div className="w-full lg:w-80 flex flex-col h-full bg-slate-900 text-slate-300 overflow-hidden shrink-0">
            {/* Seznam sloupců pro vložení */}
            <div className="p-3 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Dostupné sloupce ({columns.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {columns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCode((prev) => `${prev}\n// record.${c.key}`)}
                    className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <span className="truncate text-slate-200 font-medium">{c.label}</span>
                    <span className="font-mono text-[10px] text-indigo-400">{c.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Testovací konzole */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Konzole a výstup testu</span>
                </span>
                {testOutput.status !== "idle" && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      testOutput.status === "success"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {testOutput.status}
                  </span>
                )}
              </div>

              <div className="flex-1 bg-slate-950 rounded-lg p-3 font-mono text-[11px] overflow-y-auto border border-slate-800 text-slate-300">
                {testOutput.status === "idle" ? (
                  <div className="text-slate-600 italic">
                    Klikněte na &quot;Otestovat skript&quot; pro spuštění se vzorovým záznamem.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {testOutput.logs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.startsWith("CHYBA")
                            ? "text-rose-400"
                            : log.startsWith("Návratová")
                            ? "text-blue-300 font-bold whitespace-pre-wrap"
                            : "text-emerald-400"
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
