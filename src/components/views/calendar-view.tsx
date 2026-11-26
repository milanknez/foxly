"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  DollarSign,
  Tag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getOptionColor } from "../select-badge";

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

interface CalendarViewProps {
  records: RecordItem[];
  columns: Column[];
  table: TableData;
  badgeShape?: "circle" | "square";
  onRecordClick: (record: RecordItem) => void;
  onAddNewRecord: (initialData?: Record<string, unknown>) => void;
}

const CZECH_MONTHS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

const CZECH_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export default function CalendarView({
  records,
  columns,
  table,
  badgeShape = "circle",
  onRecordClick,
  onAddNewRecord,
}: CalendarViewProps) {
  // Najdeme všechny datumové sloupce
  const dateColumns = useMemo(
    () => columns.filter((c) => c.type === "DATE"),
    [columns]
  );

  const [activeDateColKey, setActiveDateColKey] = useState<string>(() => {
    // Preferujeme splatnost nebo datum
    const due = dateColumns.find((c) => c.key.toLowerCase().includes("due") || c.label.toLowerCase().includes("splat"));
    return due?.key || dateColumns[0]?.key || "createdAt";
  });

  // Sloupec se stavem (pro barvy štítků)
  const statusCol = useMemo(
    () => columns.find((c) => c.type === "SELECT"),
    [columns]
  );

  const primaryCol = columns.find((c) => c.isPrimary) || columns[0];
  const currencyCol = columns.find((c) => c.type === "CURRENCY" || c.type === "NUMBER");

  // Aktuálně zobrazený měsíc a rok
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 - 11

  // Posun měsíce
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Výpočet mřížky kalendáře (dny v měsíci s pondělkem jako prvním dnem)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Den v týdnu pro 1. den měsíce: 0 (Neděle) -> 6, 1 (Pondělí) -> 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Dny předchozího měsíce pro doplnění prvního týdne
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: {
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
      dateString: string; // YYYY-MM-DD
    }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      days.push({
        date: dateObj,
        isCurrentMonth: false,
        dayNumber: d,
        dateString: dateObj.toISOString().split("T")[0],
      });
    }

    // Dny aktuálního měsíce
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      days.push({
        date: dateObj,
        isCurrentMonth: true,
        dayNumber: d,
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Dny následujícího měsíce pro dokončení do 35 nebo 42 buněk
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(currentYear, currentMonth + 1, d);
      days.push({
        date: dateObj,
        isCurrentMonth: false,
        dayNumber: d,
        dateString: dateObj.toISOString().split("T")[0],
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Namapování záznamů na jednotlivé dny
  const recordsByDate = useMemo(() => {
    const map: Record<string, RecordItem[]> = {};

    for (const rec of records) {
      let rawDate = rec.data[activeDateColKey];
      if (!rawDate && activeDateColKey === "createdAt") {
        rawDate = rec.createdAt;
      }
      if (!rawDate) continue;

      const dateStr = String(rawDate).substring(0, 10);
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(rec);
    }

    return map;
  }, [records, activeDateColKey]);

  const todayStr = new Date().toISOString().split("T")[0];

  const shapeClass =
    badgeShape === "square" ? "w-2 h-2 rounded-[2px]" : "w-2 h-2 rounded-full";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* Horní lišta kalendáře */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Předchozí měsíc"
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 border-x border-slate-200 transition-colors cursor-pointer"
            >
              Dnes
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Další měsíc"
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm font-bold text-slate-900 min-w-[160px]">
            {CZECH_MONTHS[currentMonth]} {currentYear}
          </h2>
        </div>

        {/* Výběr sloupce pro zobrazení data */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Zobrazit podle data:</span>
          {dateColumns.length > 0 ? (
            <select
              value={activeDateColKey}
              onChange={(e) => setActiveDateColKey(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1e60f0] cursor-pointer"
            >
              {dateColumns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
              <option value="createdAt">Datum vytvoření</option>
            </select>
          ) : (
            <span className="font-bold text-slate-700">Datum vytvoření</span>
          )}
        </div>
      </div>

      {/* Kalendářní mřížka */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Názvy dnů v týdnu */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-[11px] font-bold text-slate-600 py-2">
            {CZECH_DAYS.map((day, idx) => (
              <div
                key={day}
                className={idx >= 5 ? "text-slate-400" : "text-slate-700"}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dny v měsíci */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 divide-x divide-y divide-slate-100 overflow-y-auto">
            {calendarDays.map((calDay) => {
              const dayRecords = recordsByDate[calDay.dateString] || [];
              const isToday = calDay.dateString === todayStr;

              return (
                <div
                  key={calDay.dateString}
                  className={`min-h-[85px] p-1.5 flex flex-col transition-colors group relative ${
                    calDay.isCurrentMonth
                      ? "bg-white hover:bg-slate-50/50"
                      : "bg-slate-50/40 text-slate-400"
                  }`}
                >
                  {/* Číslo dne a rychlé přidání */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-[#1e60f0] text-white shadow-xs"
                          : calDay.isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {calDay.dayNumber}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onAddNewRecord(
                          activeDateColKey !== "createdAt"
                            ? { [activeDateColKey]: calDay.dateString }
                            : {}
                        )
                      }
                      title={`Přidat záznam k ${calDay.dayNumber}. ${CZECH_MONTHS[currentMonth]}`}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-[#1e60f0] rounded hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Karty záznamů v daný den */}
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayRecords.map((record) => {
                      const title = String(record.data[primaryCol?.key || ""] || "Záznam");
                      const amount = currencyCol ? record.data[currencyCol.key] : null;
                      const statusVal = statusCol ? String(record.data[statusCol.key] || "") : "";
                      const color = getOptionColor(statusVal);

                      return (
                        <div
                          key={record.id}
                          onClick={() => onRecordClick(record)}
                          title={`${title}${amount ? ` (${currencyCol?.type === "CURRENCY" ? formatCurrency(Number(amount)) : amount})` : ""}`}
                          className="px-1.5 py-1 rounded-md text-[10px] font-medium border border-slate-200/80 bg-white hover:border-[#1e60f0] hover:shadow-xs transition-all cursor-pointer truncate flex items-center gap-1.5"
                          style={{
                            borderLeftWidth: "3px",
                            borderLeftColor: color,
                          }}
                        >
                          <span
                            className={`${shapeClass} shrink-0`}
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate font-semibold text-slate-800">
                            {title}
                          </span>
                          {amount !== null && amount !== undefined && (
                            <span className="font-mono text-slate-500 text-[9px] shrink-0 ml-auto">
                              {currencyCol?.type === "CURRENCY"
                                ? formatCurrency(Number(amount))
                                : String(amount)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
