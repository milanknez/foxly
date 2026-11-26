"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Save,
  Trash2,
  Hash,
  DollarSign,
  Filter,
  Palette,
  Calculator,
  Code,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

export interface MetricWidget {
  id: string;
  title: string;
  type?: "METRIC" | "HTML_SNIPPET" | "QUICK_ACTION";
  aggregation?: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
  targetColumnKey?: string;
  filterColumnKey?: string;
  filterValue?: string;
  color: string;
  width?: "NORMAL" | "WIDE" | "FULL";
  styleVariant?: "SOLID" | "OUTLINE"; // SOLID (plně barevné) vs OUTLINE (čistá bílá s barevným akcentem)
  targetGoal?: number; // Cíl / kvóta pro ukazatel plnění a progress bar
  trendText?: string; // Srovnání / trend např. "+12 % Q1" (styl Airtable)
  unit?: string; // Vlastní jednotka např. Kč, ks, hod
  htmlContent?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
}

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: MetricWidget) => void;
  onDelete?: (widgetId: string) => void;
  widgetToEdit?: MetricWidget | null;
  columns: Column[];
}

const WIDGET_COLORS = [
  { name: "Královská modrá", value: "#1e60f0" },
  { name: "Azurová", value: "#00c0f3" },
  { name: "Smaragdová", value: "#10b981" },
  { name: "Jantarová", value: "#f59e0b" },
  { name: "Korálová červená", value: "#ef4444" },
  { name: "Fialová", value: "#8b5cf6" },
  { name: "Tmavá břidlice", value: "#334155" },
];

export default function WidgetConfigModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  widgetToEdit,
  columns,
}: WidgetConfigModalProps) {
  const { confirm, alert } = useDialog();
  const [title, setTitle] = useState("");
  const [widgetType, setWidgetType] = useState<"METRIC" | "HTML_SNIPPET" | "QUICK_ACTION">("METRIC");
  const [width, setWidth] = useState<"NORMAL" | "WIDE" | "FULL">("NORMAL");
  const [styleVariant, setStyleVariant] = useState<"SOLID" | "OUTLINE">("SOLID");
  const [aggregation, setAggregation] = useState<"COUNT" | "SUM" | "AVG" | "MIN" | "MAX">("COUNT");
  const [targetColumnKey, setTargetColumnKey] = useState("");
  const [hasFilter, setHasFilter] = useState(false);
  const [filterColumnKey, setFilterColumnKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [color, setColor] = useState("#1e60f0");
  const [targetGoal, setTargetGoal] = useState("");
  const [trendText, setTrendText] = useState("");
  const [unit, setUnit] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");

  // Filtrovatelné sloupce (čísla/měny pro výpočet)
  const numericColumns = columns.filter(
    (c) => c.type === "NUMBER" || c.type === "CURRENCY"
  );

  // Sloupce vhodné pro filtrování
  const filterableColumns = columns;

  useEffect(() => {
    if (widgetToEdit) {
      setTitle(widgetToEdit.title);
      setWidgetType(widgetToEdit.type || "METRIC");
      setWidth(widgetToEdit.width || "NORMAL");
      setStyleVariant(widgetToEdit.styleVariant || "SOLID");
      setAggregation(widgetToEdit.aggregation || "COUNT");
      setTargetColumnKey(widgetToEdit.targetColumnKey || numericColumns[0]?.key || "");
      if (widgetToEdit.filterColumnKey && widgetToEdit.filterValue) {
        setHasFilter(true);
        setFilterColumnKey(widgetToEdit.filterColumnKey);
        setFilterValue(widgetToEdit.filterValue);
      } else {
        setHasFilter(false);
        setFilterColumnKey("");
        setFilterValue("");
      }
      setColor(widgetToEdit.color || "#1e60f0");
      setTargetGoal(widgetToEdit.targetGoal !== undefined ? String(widgetToEdit.targetGoal) : "");
      setTrendText(widgetToEdit.trendText || "");
      setUnit(widgetToEdit.unit || "");
      setHtmlContent(widgetToEdit.htmlContent || "");
      setActionUrl(widgetToEdit.actionUrl || "");
      setActionLabel(widgetToEdit.actionLabel || "");
    } else {
      // Výchozí hodnoty pro nový widget
      setTitle("Nový widget");
      setWidgetType("METRIC");
      setWidth("NORMAL");
      setStyleVariant("SOLID");
      setAggregation("COUNT");
      setTargetColumnKey(numericColumns[0]?.key || "");
      setHasFilter(false);
      setFilterColumnKey("");
      setFilterValue("");
      setColor("#1e60f0");
      setTargetGoal("");
      setTrendText("");
      setUnit("");
      setHtmlContent("<p><strong>Tip:</strong> Zde můžete vložit libovolný text nebo HTML kód.</p>");
      setActionUrl("");
      setActionLabel("Otevřít odkaz");
    }
  }, [widgetToEdit, isOpen, numericColumns]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      await alert("Zadejte prosím název widgetu.");
      return;
    }

    if (widgetType === "METRIC" && aggregation !== "COUNT" && !targetColumnKey) {
      await alert("Pro vybraný výpočet musíte zvolit sloupec s číslem nebo měnou.");
      return;
    }

    const newWidget: MetricWidget = {
      id: widgetToEdit ? widgetToEdit.id : `w_${Date.now()}`,
      title: title.trim().toUpperCase(),
      type: widgetType,
      width,
      styleVariant,
      aggregation: widgetType === "METRIC" ? aggregation : undefined,
      targetColumnKey: widgetType === "METRIC" && aggregation !== "COUNT" ? targetColumnKey : undefined,
      filterColumnKey: widgetType === "METRIC" && hasFilter && filterColumnKey ? filterColumnKey : undefined,
      filterValue: widgetType === "METRIC" && hasFilter && filterValue ? filterValue.trim() : undefined,
      color,
      targetGoal: targetGoal.trim() ? Number(targetGoal) : undefined,
      trendText: trendText.trim() || undefined,
      unit: unit.trim() || undefined,
      htmlContent: widgetType === "HTML_SNIPPET" ? htmlContent : undefined,
      actionUrl: widgetType === "QUICK_ACTION" ? actionUrl : undefined,
      actionLabel: widgetType === "QUICK_ACTION" ? actionLabel : undefined,
    };

    onSave(newWidget);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        {/* Hlavička */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1e60f0] font-bold flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {widgetToEdit ? "Upravit widget nad tabulkou" : "Přidat widget nad tabulku"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Počet, součet nebo průměr zobrazený v záhlaví pohledu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulář */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* 1. Typ widgetu */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Typ widgetu
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWidgetType("METRIC")}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  widgetType === "METRIC"
                    ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span className="text-[11px]">Výpočet / Metrika</span>
              </button>

              <button
                type="button"
                onClick={() => setWidgetType("HTML_SNIPPET")}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  widgetType === "HTML_SNIPPET"
                    ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Code className="w-4 h-4" />
                <span className="text-[11px]">HTML text / Banner</span>
              </button>

              <button
                type="button"
                onClick={() => setWidgetType("QUICK_ACTION")}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  widgetType === "QUICK_ACTION"
                    ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-[11px]">Akce / Odkaz</span>
              </button>
            </div>
          </div>

          {/* 2. Šířka widgetu v gridu */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Velikost widgetu (Šířka v řádku)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWidth("NORMAL")}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  width === "NORMAL"
                    ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span className="text-[11px]">◽ Normální (1×)</span>
              </button>

              <button
                type="button"
                onClick={() => setWidth("WIDE")}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  width === "WIDE"
                    ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span className="text-[11px]">▫️◽ Dvojitý (2×)</span>
              </button>

              <button
                type="button"
                onClick={() => setWidth("FULL")}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  width === "FULL"
                    ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span className="text-[11px]">⬜ Plná šířka (Full)</span>
              </button>
            </div>
          </div>

          {/* 2.5 Vzhled a styl karty */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vizuální styl karty (Barevný režim)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStyleVariant("SOLID")}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  styleVariant === "SOLID"
                    ? "bg-blue-50 text-[#1e60f0] border-[#1e60f0] font-bold shadow-xs ring-1 ring-[#1e60f0]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <div className="w-3.5 h-3.5 rounded bg-[#1e60f0]" />
                <span className="text-[11px]">🎨 Plnobarevná karta</span>
              </button>

              <button
                type="button"
                onClick={() => setStyleVariant("OUTLINE")}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  styleVariant === "OUTLINE"
                    ? "bg-blue-50 text-[#1e60f0] border-[#1e60f0] font-bold shadow-xs ring-1 ring-[#1e60f0]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <div className="w-3.5 h-3.5 rounded border-2 border-[#1e60f0] bg-white" />
                <span className="text-[11px]">🔲 Čistá bílá s akcentem (Airtable)</span>
              </button>
            </div>
          </div>

          {/* 3. Název widgetu */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Název widgetu (titulek karty)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. CELKEM K ÚHRADĚ, PRŮMĚR, ODESLÁNO..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0]"
            />
          </div>

          {/* 4. Konfigurace specifická pro vybraný typ widgetu */}
          {widgetType === "METRIC" && (
            <>
              {/* Typ výpočtu (Agregace) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Typ výpočtu (Agregace)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAggregation("COUNT")}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      aggregation === "COUNT"
                        ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="text-base font-mono">#</div>
                    <div className="text-[10px]">Počet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAggregation("SUM")}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      aggregation === "SUM"
                        ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="text-base font-mono">Σ</div>
                    <div className="text-[10px]">Součet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAggregation("AVG")}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      aggregation === "AVG"
                        ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="text-base font-mono">x̄</div>
                    <div className="text-[10px]">Průměr</div>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAggregation("MIN")}
                    className={`py-1.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      aggregation === "MIN"
                        ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span className="text-[11px]">Minimum (MIN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAggregation("MAX")}
                    className={`py-1.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      aggregation === "MAX"
                        ? "bg-[#1e60f0] text-white border-[#1e60f0] font-bold shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span className="text-[11px]">Maximum (MAX)</span>
                  </button>
                </div>
              </div>

              {/* Sloupec pro výpočet */}
              {aggregation !== "COUNT" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sloupec pro výpočet {aggregation === "SUM" ? "součtu" : aggregation === "AVG" ? "průměru" : "hodnoty"}
                  </label>
                  {numericColumns.length > 0 ? (
                    <select
                      value={targetColumnKey}
                      onChange={(e) => setTargetColumnKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 font-medium text-slate-800 cursor-pointer"
                    >
                      {numericColumns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label} ({c.type === "CURRENCY" ? "Měna Kč" : "Číslo"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      V této tabulce zatím nemáte žádný číselný sloupec ani měnu. Vytvořte prosím sloupec typu Číslo nebo Měna.
                    </p>
                  )}
                </div>
              )}

              {/* Volitelný filtr pro widget */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasFilter}
                      onChange={(e) => setHasFilter(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1e60f0] cursor-pointer"
                    />
                    <span>Filtrovat pouze vybrané záznamy (např. určitý stav)</span>
                  </label>
                </div>

                {hasFilter && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Podle sloupce
                      </label>
                      <select
                        value={filterColumnKey}
                        onChange={(e) => setFilterColumnKey(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="">-- Vyberte sloupec --</option>
                        {filterableColumns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Hodnota obsahuje
                      </label>
                      <input
                        type="text"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        placeholder="např. K úhradě, TOP..."
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pokročilé funkce */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cílová hodnota (Cíl / Kvóta)
                    </label>
                    <input
                      type="number"
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                      placeholder="např. 100000 nebo 50"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Zobrazí ukazatel % plnění a progress bar
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Trend / Srovnání
                    </label>
                    <input
                      type="text"
                      value={trendText}
                      onChange={(e) => setTrendText(e.target.value)}
                      placeholder="např. +12% tento měsíc nebo ↑ Růst"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Štítek vývoje metriky (styl Airtable Scorecard)
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* HTML Snippet konfigurace */}
          {widgetType === "HTML_SNIPPET" && (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                HTML kód nebo formátovaný text banneru
              </label>
              <textarea
                rows={4}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<p><strong>Upozornění:</strong> Zde zadejte libovolný HTML kód nebo zprávu...</p>"
                className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30"
              />
              <p className="text-[10px] text-slate-500">
                Podporuje standardní značky jako <code>&lt;strong&gt;</code>, <code>&lt;span&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;ul&gt;</code> apod.
              </p>
            </div>
          )}

          {/* Rychlá akce / Odkaz konfigurace */}
          {widgetType === "QUICK_ACTION" && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Text tlačítka akce
                </label>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="např. Otevřít faktury, Přejít do skladu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cílová URL adresa (interní nebo externí)
                </label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="např. /demo-firma nebo https://example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 5. Barva widgetu */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Barva widgetu
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {WIDGET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-slate-800 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Náhled karty */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Náhled výsledné karty:
            </span>
            <div
              className={`rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-all ${
                styleVariant === "OUTLINE"
                  ? "bg-white border-2 border-slate-200 text-slate-800"
                  : "text-white shadow-xs"
              } ${
                width === "FULL" ? "w-full" : width === "WIDE" ? "w-80" : "w-56"
              } ${targetGoal ? "h-[104px]" : "h-[90px]"}`}
              style={{
                backgroundColor: styleVariant === "OUTLINE" ? "#ffffff" : color,
                borderLeft: styleVariant === "OUTLINE" ? `5px solid ${color}` : undefined,
              }}
            >
              <div className="text-[11px] font-bold tracking-wider uppercase truncate flex items-center justify-between">
                <span className={styleVariant === "OUTLINE" ? "text-slate-600 truncate" : "opacity-90 truncate"}>
                  {title || "NÁZEV"}
                </span>
                <div className="flex items-center gap-1">
                  {trendText && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        styleVariant === "OUTLINE"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {trendText}
                    </span>
                  )}
                  <span
                    className={`font-mono text-xs px-1 rounded ${
                      styleVariant === "OUTLINE"
                        ? "bg-slate-100 text-slate-600"
                        : "opacity-70 bg-black/15"
                    }`}
                  >
                    {widgetType === "METRIC"
                      ? aggregation === "COUNT" ? "#" : aggregation === "SUM" ? "Σ" : "x̄"
                      : widgetType === "HTML_SNIPPET" ? "</>" : "⚡"}
                  </span>
                </div>
              </div>

              {widgetType === "METRIC" ? (
                <div>
                  <div
                    className={`text-2xl font-light tracking-tight text-center pb-0.5 ${
                      styleVariant === "OUTLINE" ? "text-slate-900 font-semibold" : ""
                    }`}
                  >
                    {aggregation === "COUNT" ? "14" : "48 400 Kč"}
                  </div>
                  {targetGoal && Number(targetGoal) > 0 && (
                    <div className="space-y-0.5">
                      <div className="w-full bg-slate-200/60 dark:bg-white/20 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: "68%",
                            backgroundColor: styleVariant === "OUTLINE" ? color : "#ffffff",
                          }}
                        />
                      </div>
                      <div
                        className={`flex justify-between items-center text-[9px] ${
                          styleVariant === "OUTLINE" ? "text-slate-500" : "opacity-80"
                        }`}
                      >
                        <span>Cíl: {Number(targetGoal).toLocaleString("cs-CZ")}</span>
                        <span className="font-bold">68%</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : widgetType === "HTML_SNIPPET" ? (
                <div
                  className={`text-xs line-clamp-2 ${
                    styleVariant === "OUTLINE" ? "text-slate-700" : "text-white/95"
                  }`}
                  dangerouslySetInnerHTML={{ __html: htmlContent || "Váš text nebo HTML..." }}
                />
              ) : (
                <div className="flex items-center justify-center">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      styleVariant === "OUTLINE"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-white/20 hover:bg-white/30 text-white"
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{actionLabel || "Otevřít odkaz"}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tlačítka uložení */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {widgetToEdit && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  const isConfirmed = await confirm("Opravdu smazat tento widget?");
                  if (isConfirmed) {
                    onDelete(widgetToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Smazat widget
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1e60f0] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{widgetToEdit ? "Uložit změny" : "Přidat widget"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
