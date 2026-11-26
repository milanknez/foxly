"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Flame,
  Leaf,
  Calendar,
  DollarSign,
  Clock,
  MoreVertical,
  CheckCircle2,
  ScanText,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import SelectBadge, { SelectOption, getOptionColor } from "../select-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  isRequired: boolean;
  isPrimary: boolean;
  config: Record<string, unknown>;
}

interface RecordItem {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  source: string;
}

interface TableData {
  id: string;
  name: string;
  singularName: string;
  columns: Column[];
  records: RecordItem[];
}

interface KanbanViewProps {
  records: RecordItem[];
  columns: Column[];
  table: TableData;
  badgeShape?: "circle" | "square";
  onRecordClick: (record: RecordItem) => void;
  onStatusChange: (recordId: string, statusColKey: string, newStatus: string) => void;
  onAddNewRecord: (initialData?: Record<string, unknown>) => void;
}

export default function KanbanView({
  records,
  columns,
  table,
  badgeShape = "circle",
  onRecordClick,
  onStatusChange,
  onAddNewRecord,
}: KanbanViewProps) {
  // Najdeme sloupce typu SELECT, které lze použít pro sloupce Kanbanu
  const selectColumns = useMemo(
    () => columns.filter((c) => c.type === "SELECT"),
    [columns]
  );

  const [activeGroupKey, setActiveGroupKey] = useState<string>(() => {
    return selectColumns[0]?.key || "status";
  });

  const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);

  const groupCol = columns.find((c) => c.key === activeGroupKey) || selectColumns[0];

  // Možnosti pro seskupovací sloupec
  const options: SelectOption[] = useMemo(() => {
    if (!groupCol) return [];
    if (Array.isArray(groupCol.config?.options)) {
      return groupCol.config.options as SelectOption[];
    }
    return [
      { id: "opt_nove", label: "Nové", color: "#1e60f0" },
      { id: "opt_probiha", label: "V řešení", color: "#f59e0b" },
      { id: "opt_hotovo", label: "Hotovo", color: "#10b981" },
    ];
  }, [groupCol]);

  // Pomocné sloupce pro zobrazení na kartě
  const primaryCol = columns.find((c) => c.isPrimary) || columns[0];
  const currencyCol = columns.find((c) => c.type === "CURRENCY" || c.type === "NUMBER");
  const dateCol = columns.find((c) => c.type === "DATE");
  const priorityCol = columns.find((c) =>
    c.key.toLowerCase().includes("priorit") || c.label.toLowerCase().includes("priorit")
  );

  // Seskupení záznamů do jednotlivých sloupců
  const groupedRecords = useMemo(() => {
    const map: Record<string, RecordItem[]> = {};

    for (const opt of options) {
      map[opt.label] = [];
    }
    map["__empty__"] = [];

    for (const rec of records) {
      const val = String(rec.data[groupCol?.key || ""] || "");
      if (val && map[val]) {
        map[val].push(rec);
      } else {
        map["__empty__"].push(rec);
      }
    }

    return map;
  }, [records, options, groupCol]);

  // Drag & drop obsluha
  const handleDragStart = (e: React.DragEvent, recordId: string) => {
    e.dataTransfer.setData("text/plain", recordId);
    setDraggedRecordId(recordId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData("text/plain") || draggedRecordId;
    if (recordId && groupCol) {
      onStatusChange(recordId, groupCol.key, targetStatus === "__empty__" ? "" : targetStatus);
    }
    setDraggedRecordId(null);
  };

  const shapeClass =
    badgeShape === "square" ? "w-2.5 h-2.5 rounded-[3px]" : "w-2.5 h-2.5 rounded-full";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* Horní lišta Kanbanu */}
      <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Seskupit podle:</span>
          {selectColumns.length > 0 ? (
            <select
              value={activeGroupKey}
              onChange={(e) => setActiveGroupKey(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1e60f0] cursor-pointer"
            >
              {selectColumns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-bold text-slate-700">Výchozí stavy</span>
          )}
        </div>

        <div className="text-slate-500 text-[11px]">
          Přetažením myší (Drag & Drop) můžete karty přesouvat mezi stavy
        </div>
      </div>

      {/* Tělo Kanbanu se sloupci */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-5">
        {options.map((opt, idx) => {
          const colColor = getOptionColor(opt.label, opt.color, idx);
          const colRecords = groupedRecords[opt.label] || [];

          // Součet hodnot v tomto sloupci
          const columnTotal = currencyCol
            ? colRecords.reduce((acc, curr) => acc + (Number(curr.data[currencyCol.key]) || 0), 0)
            : 0;

          return (
            <div
              key={opt.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, opt.label)}
              className="w-80 shrink-0 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col max-h-full overflow-hidden shadow-xs"
            >
              {/* Hlavička sloupce */}
              <div className="p-3.5 border-b border-slate-200 bg-white/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`${shapeClass} shrink-0 shadow-xs`}
                    style={{ backgroundColor: colColor }}
                  />
                  <h3 className="font-bold text-xs text-slate-800 truncate">
                    {opt.label}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {colRecords.length}
                  </span>
                </div>

                {currencyCol && columnTotal > 0 && (
                  <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {currencyCol.type === "CURRENCY"
                      ? formatCurrency(columnTotal)
                      : columnTotal.toLocaleString("cs-CZ")}
                  </span>
                )}
              </div>

              {/* Seznam karet ve sloupci */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colRecords.map((record) => {
                  const titleVal = record.data[primaryCol?.key || ""] || "Bez názvu";
                  const amountVal = currencyCol ? record.data[currencyCol.key] : null;
                  const dateVal = dateCol ? record.data[dateCol.key] : null;
                  const priorityVal = priorityCol ? String(record.data[priorityCol.key] || "") : "";

                  return (
                    <div
                      key={record.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, record.id)}
                      onClick={() => onRecordClick(record)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-[#1e60f0]/40 transition-all cursor-pointer group select-none active:scale-95"
                    >
                      {/* Horní řádek karty: Zdroj & Priorita */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          {record.source === "OCR" ? (
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <ScanText className="w-2.5 h-2.5" /> OCR
                            </span>
                          ) : record.source === "PUBLIC_FORM" ? (
                            <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" /> Web
                            </span>
                          ) : null}

                          {priorityVal && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold">
                              {priorityVal.toUpperCase().includes("TOP") ? (
                                <span className="text-rose-600 flex items-center gap-0.5">
                                  <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> TOP
                                </span>
                              ) : (
                                <span className="text-emerald-600 flex items-center gap-0.5">
                                  <Leaf className="w-3 h-3 text-emerald-500 fill-emerald-500" /> MED
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Rychlý přesun mezi stavy */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <select
                            value={opt.label}
                            onChange={(e) =>
                              groupCol && onStatusChange(record.id, groupCol.key, e.target.value)
                            }
                            className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-semibold text-slate-600 focus:outline-none"
                          >
                            {options.map((o) => (
                              <option key={o.id} value={o.label}>
                                → {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Hlavní název */}
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-2 mb-2 group-hover:text-[#1e60f0] transition-colors">
                        {String(titleVal)}
                      </h4>

                      {/* Částka a splatnost */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        {amountVal !== null && amountVal !== undefined ? (
                          <span className="font-mono font-bold text-slate-900">
                            {currencyCol?.type === "CURRENCY"
                              ? formatCurrency(Number(amountVal))
                              : Number(amountVal).toLocaleString("cs-CZ")}
                          </span>
                        ) : (
                          <span />
                        )}

                        {!!dateVal && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(String(dateVal))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colRecords.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Žádné karty
                  </div>
                )}
              </div>

              {/* Tlačítko přidat do sloupce */}
              <div className="p-2.5 border-t border-slate-200/80 bg-white/50">
                <button
                  type="button"
                  onClick={() =>
                    onAddNewRecord(groupCol ? { [groupCol.key]: opt.label } : {})
                  }
                  className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#1e60f0] text-slate-600 hover:text-[#1e60f0] hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Přidat kartu</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Sloupec pro nezařazené karty */}
        {(groupedRecords["__empty__"] || []).length > 0 && (
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "__empty__")}
            className="w-80 shrink-0 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300 flex flex-col max-h-full overflow-hidden"
          >
            <div className="p-3.5 border-b border-slate-200 bg-white/50 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-500">Bez zařazení</span>
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                {groupedRecords["__empty__"].length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {groupedRecords["__empty__"].map((record) => (
                <div
                  key={record.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, record.id)}
                  onClick={() => onRecordClick(record)}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-[#1e60f0] cursor-pointer"
                >
                  <h4 className="font-bold text-xs text-slate-800 truncate">
                    {String(record.data[primaryCol?.key || ""] || "Bez názvu")}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
