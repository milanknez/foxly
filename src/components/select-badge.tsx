"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
}

export function getContrastTextColor(hex?: string): string {
  if (!hex || !hex.startsWith("#")) return "#ffffff";
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  // Koeficient vnímaného jasu (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}

interface SelectBadgeProps {
  value: string | undefined | null;
  options: SelectOption[];
  badgeShape?: "circle" | "square" | "none";
  badgeStyle?: "dot" | "subtle" | "fill";
  badgeDisplayType?: "circle" | "square" | "badge";
  onChange?: (newValue: string) => void;
  disabled?: boolean;
  className?: string;
}

// Výchozí paleta barev pro položky, které nemají barvu explicitně definovanou
const DEFAULT_PALETTE = [
  "#3b82f6", // modrá
  "#10b981", // zelená
  "#f59e0b", // jantarová/oranžová
  "#ef4444", // červená
  "#8b5cf6", // fialová
  "#06b6d4", // azurová
  "#ec4899", // růžová
  "#64748b", // břidlicová
];

export function getOptionColor(label: string, optionColor?: string, index = 0): string {
  if (optionColor) return optionColor;
  const l = label.toLowerCase();
  if (l.includes("nov") || l.includes("new")) return "#1e60f0";
  if (l.includes("odesl") || l.includes("sent")) return "#00c0f3";
  if (l.includes("uhr") || l.includes("zaplac") || l.includes("paid") || l.includes("hotov") || l.includes("vyřeš")) return "#10b981";
  if (l.includes("ček") || l.includes("k úhrad") || l.includes("schval") || l.includes("řešen") || l.includes("průběh")) return "#f59e0b";
  if (l.includes("splatn") || l.includes("chyb") || l.includes("zruš") || l.includes("storno") || l.includes("kritick") || l.includes("blok")) return "#ef4444";
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

export default function SelectBadge({
  value,
  options,
  badgeShape = "circle",
  badgeStyle = "subtle",
  badgeDisplayType,
  onChange,
  disabled = false,
  className = "",
}: SelectBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zavření dropdownu při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const valStr = String(value ?? "").trim().toLowerCase();
  const currentOption = options.find(
    (opt) =>
      opt.label.toLowerCase() === valStr ||
      opt.id.toLowerCase() === valStr ||
      opt.label === value ||
      opt.id === value
  );

  const displayColor = currentOption?.color
    ? currentOption.color
    : getOptionColor(
        currentOption?.label || String(value || ""),
        currentOption?.color,
        currentOption ? options.indexOf(currentOption) : 0
      );

  // Zda se má zobrazit čistá odrážka kruh / čtverec nebo pozadí štítku
  const resolvedType: "circle" | "square" | "badge" =
    badgeDisplayType ||
    (badgeStyle === "fill" || badgeStyle === "subtle"
      ? "badge"
      : badgeShape === "square"
      ? "square"
      : "circle");

  const isBadge = resolvedType === "badge";
  const isFill = isBadge && badgeStyle === "fill";
  const isSquare = resolvedType === "square" || badgeShape === "square";
  const shapeClass = isSquare ? "w-2.5 h-2.5 rounded-[3px]" : "w-2.5 h-2.5 rounded-full";

  if (!onChange || disabled) {
    if (!value) return <span className="text-slate-400 text-xs italic">-</span>;

    if (!isBadge) {
      // Odrážka kruh / čtverec - bez ohraničení a pozadí, čistý styl dle příkladu uživatele
      return (
        <span className={`inline-flex items-center gap-1.5 py-0.5 text-xs font-medium text-slate-800 ${className}`}>
          <span
            className={`${shapeClass} shrink-0 shadow-2xs`}
            style={{ backgroundColor: displayColor }}
          />
          <span className="truncate max-w-[140px]">{currentOption?.label || value}</span>
        </span>
      );
    }

    // Pozadí štítku (plné nebo jemné podbarvení)
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${className}`}
        style={
          isFill
            ? {
                backgroundColor: displayColor,
                borderColor: displayColor,
                color: getContrastTextColor(displayColor),
              }
            : {
                backgroundColor: `${displayColor}18`,
                borderColor: `${displayColor}40`,
                color: displayColor,
              }
        }
      >
        {!isFill && (
          <span
            className={`${shapeClass} shrink-0 shadow-2xs`}
            style={{ backgroundColor: displayColor }}
          />
        )}
        <span className="truncate max-w-[140px]">{currentOption?.label || value}</span>
      </span>
    );
  }

  // Příprava stylů pro interaktivní tlačítko
  let buttonClasses = "";
  let buttonStyle: React.CSSProperties | undefined = undefined;

  if (!value) {
    buttonClasses = "bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200";
  } else if (!isBadge) {
    // Odrážka kruh nebo čtverec - čistý styl jako na screenshotu
    buttonClasses = "bg-transparent hover:bg-slate-100/80 text-slate-800 font-medium border border-transparent hover:border-slate-200";
  } else if (isFill) {
    // Plná výplň pozadí štítku
    buttonClasses = "font-semibold border shadow-2xs";
    buttonStyle = {
      backgroundColor: displayColor,
      borderColor: displayColor,
      color: getContrastTextColor(displayColor),
    };
  } else {
    // Jemné podbarvení pozadí štítku
    buttonClasses = "font-semibold border";
    buttonStyle = {
      backgroundColor: `${displayColor}18`,
      borderColor: `${displayColor}40`,
      color: displayColor,
    };
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs transition-all focus:outline-none cursor-pointer group ${buttonClasses} ${className}`}
        style={buttonStyle}
      >
        {value ? (
          <>
            {(!isBadge || !isFill) && (
              <span
                className={`${shapeClass} shrink-0 shadow-2xs`}
                style={{ backgroundColor: displayColor }}
              />
            )}
            <span className="truncate max-w-[130px]">
              {currentOption?.label || value}
            </span>
          </>
        ) : (
          <span className="text-slate-400 font-normal">Vyberte...</span>
        )}
        <ChevronDown
          className={`w-3 h-3 shrink-0 ml-0.5 transition-opacity ${
            !value
              ? "opacity-40"
              : isBadge
              ? "opacity-70"
              : "opacity-0 group-hover:opacity-70 text-slate-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 min-w-[180px] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Možnosti</span>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-red-500 flex items-center gap-0.5 text-[9px]"
              >
                <X className="w-2.5 h-2.5" /> Vymazat
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-auto py-0.5">
            {options.map((opt, idx) => {
              const optColor = getOptionColor(opt.label, opt.color, idx);
              const isSelected = opt.label === value || opt.id === value;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.label);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected ? "bg-slate-100/70 font-bold" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`${shapeClass} shrink-0 shadow-xs`}
                      style={{ backgroundColor: optColor }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#1e60f0] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
