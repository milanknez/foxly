"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";
import { formatCzechDate, parseCzechDateToIso } from "@/lib/utils";

export interface DateCellProps {
  value: unknown;
  onChange: (dateVal: string) => void;
  className?: string;
  disabled?: boolean;
  variant?: "cell" | "form";
  placeholder?: string;
}

export default function DateCell({
  value,
  onChange,
  className = "",
  disabled = false,
  variant = "cell",
  placeholder = "DD.MM.RRRR",
}: DateCellProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const displayDate = formatCzechDate(value);
  const [inputValue, setInputValue] = useState(displayDate);

  useEffect(() => {
    setInputValue(formatCzechDate(value));
  }, [value]);

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const formatted = formatCzechDate(trimmed);
    const iso = parseCzechDateToIso(trimmed);
    setInputValue(formatted);
    // Ukládáme ISO formát (YYYY-MM-DD), aby řazení i filtry zůstaly konzistentní
    onChange(iso || trimmed);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value; // YYYY-MM-DD
    if (isoVal) {
      setInputValue(formatCzechDate(isoVal));
      onChange(isoVal);
    }
  };

  const handleOpenPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (pickerRef.current) {
      if (typeof pickerRef.current.showPicker === "function") {
        try {
          pickerRef.current.showPicker();
        } catch {
          pickerRef.current.focus();
        }
      } else {
        pickerRef.current.focus();
      }
    }
  };

  const isoValue = parseCzechDateToIso(String(value || ""));

  if (variant === "form") {
    return (
      <div className={`relative flex items-center w-full ${className}`}>
        <input
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0] transition-colors pr-9 font-medium text-slate-800"
        />

        <input
          ref={pickerRef}
          type="date"
          disabled={disabled}
          value={isoValue}
          onChange={handlePickerChange}
          className="sr-only pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        />

        {!disabled && (
          <button
            type="button"
            onClick={handleOpenPicker}
            title="Otevřít kalendář pro výběr data"
            className="absolute right-2 p-1 text-slate-400 hover:text-[#1e60f0] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Výchozí buňka v tabulce ("cell")
  return (
    <div
      className={`relative flex items-center group/date w-full ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        disabled={disabled}
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full text-xs py-1 pl-2 pr-7 rounded border border-transparent hover:border-slate-300 focus:border-[#1e60f0] bg-transparent font-medium text-slate-800 focus:outline-none focus:bg-white transition-colors"
      />

      {/* Skrytý nativní datepicker pro kalendářové vybírátko */}
      <input
        ref={pickerRef}
        type="date"
        disabled={disabled}
        value={isoValue}
        onChange={handlePickerChange}
        className="sr-only pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Ikonka kalendáře pro otevření vybírátka */}
      {!disabled && (
        <button
          type="button"
          onClick={handleOpenPicker}
          title="Otevřít kalendář pro výběr data"
          className="absolute right-1 p-1 text-slate-400 hover:text-[#1e60f0] hover:bg-blue-50 rounded transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
