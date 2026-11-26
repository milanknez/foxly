"use client";

import React, { useState } from "react";
import {
  Palette,
  Plus,
  Trash2,
  Check,
  X,
  Type,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export interface FormattingRule {
  id: string;
  fieldKey: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IS_EMPTY"
    | "IS_NOT_EMPTY";
  value: string;
  target: "ROW" | "CELL";
  targetFieldKey?: string;
  color: string;
  isBold?: boolean;
  isStrikethrough?: boolean;
}

export const FORMATTING_PRESETS: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  green: {
    label: "Zelená (Hotovo / Úspěch)",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
  },
  red: {
    label: "Červená (Po splatnosti / Urgentní / Chyba)",
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca",
  },
  amber: {
    label: "Žlutá / Oranžová (Čeká / Upozornění)",
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
  },
  blue: {
    label: "Modrá (V procesu / Informace)",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe",
  },
  purple: {
    label: "Fialová (Speciální / Priorita)",
    bg: "#faf5ff",
    text: "#6b21a8",
    border: "#e9d5ff",
  },
  gray: {
    label: "Šedá (Zrušeno / Archiv)",
    bg: "#f1f5f9",
    text: "#475569",
    border: "#cbd5e1",
  },
};

interface ColumnItem {
  id: string;
  key: string;
  label: string;
  type: string;
}

interface ConditionalFormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  rules: FormattingRule[];
  onSave: (rules: FormattingRule[]) => void;
}

export default function ConditionalFormattingModal({
  isOpen,
  onClose,
  columns,
  rules: initialRules,
  onSave,
}: ConditionalFormattingModalProps) {
  const [rules, setRules] = useState<FormattingRule[]>(initialRules);

  if (!isOpen) return null;

  const handleAddRule = () => {
    const defaultCol = columns[0]?.key || "fld_nazev";
    const newRule: FormattingRule = {
      id: `rule_${Date.now()}`,
      fieldKey: defaultCol,
      operator: "EQUALS",
      value: "",
      target: "ROW",
      targetFieldKey: defaultCol,
      color: "green",
      isBold: false,
      isStrikethrough: false,
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<FormattingRule>) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleSave = () => {
    onSave(rules);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Hlavička */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Podmíněné formátování tabulky
              </h3>
              <p className="text-[11px] text-slate-500">
                Barevné zvýraznění řádků nebo buněk podle zadaných podmínek
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Obsah pravidel */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {rules.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  Zatím nemáte vytvořené žádné pravidlo
                </h4>
                <p className="text-slate-500 text-[11px] max-w-sm mx-auto mt-1 leading-relaxed">
                  Podmíněné formátování vám umožní automaticky obarvit např. řádky se stavem „Hotovo“ na zeleno nebo po splatnosti na červeno.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Přidat první pravidlo
              </button>
            </div>
          ) : (
            rules.map((rule, index) => {
              const preset = FORMATTING_PRESETS[rule.color] || FORMATTING_PRESETS.green;
              const isValueRequired =
                rule.operator !== "IS_EMPTY" && rule.operator !== "IS_NOT_EMPTY";

              return (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      Pravidlo formátování
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title="Smazat pravidlo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Podmínka (Když ...) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Sloupec
                      </label>
                      <select
                        value={rule.fieldKey}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, {
                            fieldKey: e.target.value,
                            targetFieldKey: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {columns.map((c) => (
                          <option key={c.id} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Podmínka
                      </label>
                      <select
                        value={rule.operator}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, {
                            operator: e.target.value as any,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="EQUALS">Rovná se</option>
                        <option value="NOT_EQUALS">Nerovná se</option>
                        <option value="CONTAINS">Obsahuje text</option>
                        <option value="NOT_CONTAINS">Neobsahuje text</option>
                        <option value="GREATER_THAN">Je větší než (&gt;)</option>
                        <option value="LESS_THAN">Je menší než (&lt;)</option>
                        <option value="IS_EMPTY">Je prázdné</option>
                        <option value="IS_NOT_EMPTY">Není prázdné</option>
                      </select>
                    </div>

                    {isValueRequired && (
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Hodnota
                        </label>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, { value: e.target.value })
                          }
                          placeholder="např. Hotovo, 1000..."
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Cíl formátování a Barva */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Zvýraznit
                      </label>
                      <select
                        value={rule.target}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, {
                            target: e.target.value as "ROW" | "CELL",
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="ROW">Celý řádek tabulky</option>
                        <option value="CELL">Pouze buňku ve sloupci</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Styl barvy
                      </label>
                      <select
                        value={rule.color}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { color: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {Object.entries(FORMATTING_PRESETS).map(
                          ([key, conf]) => (
                            <option key={key} value={key}>
                              {conf.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Doplňkový styl: Bold & Strikethrough + Náhled */}
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center gap-3 h-8">
                        <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none font-semibold text-[11px]">
                          <input
                            type="checkbox"
                            checked={!!rule.isBold}
                            onChange={(e) =>
                              handleUpdateRule(rule.id, {
                                isBold: e.target.checked,
                              })
                            }
                            className="rounded text-blue-600 cursor-pointer"
                          />
                          <span>Tučné</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none font-semibold text-[11px]">
                          <input
                            type="checkbox"
                            checked={!!rule.isStrikethrough}
                            onChange={(e) =>
                              handleUpdateRule(rule.id, {
                                isStrikethrough: e.target.checked,
                              })
                            }
                            className="rounded text-blue-600 cursor-pointer"
                          />
                          <span>Přeškrtnout</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Živý náhled formátování */}
                  <div className="pt-2 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-slate-400" /> Náhled stylu:
                    </span>
                    <span
                      style={{
                        backgroundColor: preset.bg,
                        color: preset.text,
                        borderColor: preset.border,
                        fontWeight: rule.isBold ? "bold" : "normal",
                        textDecoration: rule.isStrikethrough
                          ? "line-through"
                          : "none",
                      }}
                      className="px-3 py-1 rounded-md border text-xs shadow-2xs font-medium"
                    >
                      Ukázkový text buňky
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {rules.length > 0 && (
            <button
              type="button"
              onClick={handleAddRule}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-600 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-50/50 hover:bg-blue-50/30"
            >
              <Plus className="w-3.5 h-3.5" /> Přidat další pravidlo formátování
            </button>
          )}
        </div>

        {/* Patička */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="text-[11px] text-slate-500">
            Aktivní pravidla: <strong>{rules.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Uložit a aplikovat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
