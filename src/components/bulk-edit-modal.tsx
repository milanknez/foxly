"use client";

import React, { useState, useEffect } from "react";
import { X, Check, SlidersHorizontal, Loader2, Sparkles } from "lucide-react";
import SelectBadge, { SelectOption } from "@/components/select-badge";

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  columns: Column[];
  badgeShape?: "circle" | "square";
  onApply: (columnKey: string, value: unknown) => Promise<void>;
}

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedCount,
  columns,
  badgeShape = "circle",
  onApply,
}: BulkEditModalProps) {
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>("");
  const [newValue, setNewValue] = useState<unknown>("");
  const [loading, setLoading] = useState(false);

  // Filtrujeme sloupce, které má smysl hromadně upravovat
  const editableColumns = columns.filter(
    (c) => c.type !== "ATTACHMENT"
  );

  useEffect(() => {
    if (isOpen) {
      const defaultCol = editableColumns[0]?.key || "";
      setSelectedColumnKey(defaultCol);
      setNewValue("");
    }
  }, [isOpen]);

  // Vybraný sloupec
  const currentColumn = editableColumns.find((c) => c.key === selectedColumnKey);

  // Možnosti pro SELECT sloupec
  const selectOptions: SelectOption[] =
    currentColumn?.type === "SELECT" && Array.isArray(currentColumn?.config?.options)
      ? (currentColumn.config.options as SelectOption[])
      : [];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColumnKey) return;

    try {
      setLoading(true);
      await onApply(selectedColumnKey, newValue);
      onClose();
    } catch (err) {
      console.error("Bulk edit failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Hlavička */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1e60f0] flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Hromadná změna hodnot
              </h3>
              <p className="text-[11px] text-slate-500">
                Nastavení společné hodnoty pro vybrané řádky
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informační lišta o výběru */}
        <div className="bg-blue-50/80 px-5 py-2.5 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <span>
            Bude aktualizováno: <strong className="font-bold">{selectedCount}</strong> {selectedCount === 1 ? "záznam" : selectedCount < 5 ? "záznamy" : "záznamů"}
          </span>
          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
            Hromadná akce
          </span>
        </div>

        {/* Formulář */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* 1. Výběr sloupce */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vyberte sloupec pro úpravu
            </label>
            <select
              value={selectedColumnKey}
              onChange={(e) => {
                setSelectedColumnKey(e.target.value);
                const col = editableColumns.find((c) => c.key === e.target.value);
                if (col?.type === "CHECKBOX") {
                  setNewValue(true);
                } else if (col?.type === "SELECT") {
                  const opts = (col.config?.options as SelectOption[]) || [];
                  setNewValue(opts[0]?.label || "");
                } else {
                  setNewValue("");
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 font-medium text-slate-800 cursor-pointer"
            >
              {editableColumns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Zadaná nová hodnota podle typu */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nová hodnota pro všechny vybrané řádky
            </label>

            {currentColumn?.type === "SELECT" ? (
              <div className="space-y-2">
                <select
                  value={String(newValue || "")}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 font-medium text-slate-800 cursor-pointer"
                >
                  <option value="">-- Vyberte novou možnost --</option>
                  {selectOptions.map((opt) => (
                    <option key={opt.id} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {Boolean(newValue) && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-slate-500">Náhled štítku:</span>
                    <SelectBadge
                      value={String(newValue)}
                      options={selectOptions}
                      badgeDisplayType={(currentColumn?.config as any)?.badgeDisplayType}
                      badgeShape={(currentColumn?.config as any)?.badgeShape || badgeShape}
                      badgeStyle={(currentColumn?.config as any)?.badgeStyle || "subtle"}
                      disabled
                    />
                  </div>
                )}
              </div>
            ) : currentColumn?.type === "CHECKBOX" ? (
              <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={!!newValue}
                  onChange={(e) => setNewValue(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1e60f0]"
                />
                <span className="font-semibold text-slate-800">
                  {newValue ? "Zaškrtnuto (Ano)" : "Nezaškrtnuto (Ne)"}
                </span>
              </label>
            ) : currentColumn?.type === "DATE" ? (
              <input
                type="date"
                value={String(newValue || "")}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30"
              />
            ) : currentColumn?.type === "NUMBER" || currentColumn?.type === "CURRENCY" ? (
              <input
                type="number"
                value={String(newValue ?? "")}
                onChange={(e) => setNewValue(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={currentColumn.type === "CURRENCY" ? "např. 25000" : "0"}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 font-mono"
              />
            ) : (
              <input
                type="text"
                value={String(newValue || "")}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Zadejte nový text nebo hodnotu..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30"
              />
            )}
          </div>

          {/* Upozornění */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
            ⚠️ <strong>Upozornění:</strong> Tato změna přepíše hodnotu v poli{" "}
            <strong>{currentColumn?.label}</strong> u všech{" "}
            <strong>{selectedCount}</strong> označených záznamů.
          </div>

          {/* Tlačítka */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading || !selectedColumnKey}
              className="px-4 py-2 bg-[#1e60f0] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ukládám...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Aplikovat na vybrané řádky
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
