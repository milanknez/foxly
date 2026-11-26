"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  SlidersHorizontal,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  Palette,
  KeyRound,
  Asterisk,
  Layers,
  Type,
  Hash,
  Coins,
  Calendar,
  CheckSquare,
  ListFilter,
  AlignLeft,
  Image as ImageIcon,
  FileText,
  Paperclip,
  Globe,
  Link2,
  Code2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Edit3,
} from "lucide-react";
import { slugifyColumnKey, generateUniqueColumnKey } from "@/lib/utils";
import { useDialog } from "@/components/ui/dialog-provider";
import EditTableModal from "@/components/edit-table-modal";

interface OptionItem {
  id: string;
  label: string;
  color: string;
}

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  isUnique: boolean;
  isPrimary: boolean;
  defaultValue: unknown;
  config: Record<string, unknown>;
  sortOrder: number;
}

interface TableData {
  id: string;
  name: string;
  singularName: string;
  icon?: string;
  columns: Column[];
}

const colorPalette = [
  "#3b82f6", // modrá
  "#10b981", // zelená
  "#f59e0b", // žlutá/oranžová
  "#ef4444", // červená
  "#8b5cf6", // fialová
  "#64748b", // šedá
  "#06b6d4", // tyrkysová
];

export default function SchemaBuilderClient({
  table,
  workspaceSlug,
  appId,
}: {
  table: TableData;
  workspaceSlug: string;
  appId: string;
}) {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [columns, setColumns] = useState<Column[]>(table.columns);

  // Stav pro název, jednotné číslo a ikonu tabulky
  const [currentTableName, setCurrentTableName] = useState(table.name);
  const [currentTableSingular, setCurrentTableSingular] = useState(table.singularName);
  const [currentTableIcon, setCurrentTableIcon] = useState(table.icon || "Table");
  const [showEditTableModal, setShowEditTableModal] = useState(false);

  // Editovaný nebo nový sloupec
  const [editingColId, setEditingColId] = useState<string | null>(null);

  // Formulářová pole
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [isKeyManual, setIsKeyManual] = useState(false);
  const [type, setType] = useState("TEXT");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");

  // Specifická konfigurace
  const [currency, setCurrency] = useState("CZK");
  const [precision, setPrecision] = useState(2);
  const [options, setOptions] = useState<OptionItem[]>([
    { id: "opt_1", label: "Možnost 1", color: "#3b82f6" },
    { id: "opt_2", label: "Možnost 2", color: "#10b981" },
  ]);
  const [badgeDisplayType, setBadgeDisplayType] = useState<"circle" | "square" | "badge">("circle");
  const [badgeFillStyle, setBadgeFillStyle] = useState<"subtle" | "fill">("subtle");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stav pro změnu pořadí sloupců (Drag & Drop a tlačítka)
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Uložení nového pořadí sloupců do DB
  const saveColumnOrder = async (newColumns: Column[]) => {
    setColumns(newColumns);
    try {
      const columnIds = newColumns.map((c) => c.id);
      const res = await fetch(`/api/tables/${table.id}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnIds }),
      });
      if (res.ok) {
        setSuccessMsg("Pořadí sloupců bylo uloženo!");
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } catch (e) {
      console.error("Failed to reorder columns:", e);
    }
  };

  // Posun sloupce nahoru
  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[index - 1];
    newCols[index - 1] = temp;
    saveColumnOrder(newCols);
  };

  // Posun sloupce dolů
  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= columns.length - 1) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[index + 1];
    newCols[index + 1] = temp;
    saveColumnOrder(newCols);
  };

  // Drag & drop události
  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      return;
    }

    const sourceIndex = columns.findIndex((c) => c.id === draggedColId);
    const targetIndex = columns.findIndex((c) => c.id === targetColId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedColId(null);
      return;
    }

    const newCols = [...columns];
    const [moved] = newCols.splice(sourceIndex, 1);
    newCols.splice(targetIndex, 0, moved);

    setDraggedColId(null);
    saveColumnOrder(newCols);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  // Načtení existujícího sloupce do editoru
  const handleSelectColumnForEdit = (col: Column) => {
    setEditingColId(col.id);
    setIsKeyManual(true);
    setLabel(col.label);
    setKey(col.key);
    setType(col.type);
    setDescription(col.description || "");
    setIsRequired(col.isRequired);
    setIsUnique(col.isUnique);
    setIsPrimary(col.isPrimary);
    setDefaultValue(col.defaultValue !== null && col.defaultValue !== undefined ? String(col.defaultValue) : "");

    const cfg = (col.config as Record<string, any>) || {};
    if (cfg.currency) setCurrency(String(cfg.currency));
    if (cfg.precision !== undefined) setPrecision(Number(cfg.precision));
    if (cfg.badgeDisplayType) {
      setBadgeDisplayType(cfg.badgeDisplayType);
    } else if (cfg.badgeStyle === "fill" || cfg.badgeStyle === "subtle") {
      setBadgeDisplayType("badge");
    } else if (cfg.badgeShape === "square") {
      setBadgeDisplayType("square");
    } else {
      setBadgeDisplayType("circle");
    }
    if (cfg.badgeStyle === "fill") {
      setBadgeFillStyle("fill");
    } else {
      setBadgeFillStyle("subtle");
    }

    if (Array.isArray(cfg.options)) {
      const normalized = cfg.options.map((o: any, idx: number) => {
        if (typeof o === "string") {
          return {
            id: `opt_${idx}_${Date.now()}`,
            label: o,
            color: colorPalette[idx % colorPalette.length],
          };
        }
        return {
          id: o?.id ? String(o.id) : `opt_${idx}_${Date.now()}`,
          label: o?.label ? String(o.label) : `Možnost ${idx + 1}`,
          color: o?.color ? String(o.color) : colorPalette[idx % colorPalette.length],
        };
      });
      setOptions(normalized);
    } else {
      setOptions([{ id: "opt_1", label: "Položka 1", color: "#3b82f6" }]);
    }
  };

  // Vyčištění editoru pro nový sloupec
  const handleStartNewColumn = () => {
    setEditingColId(null);
    setIsKeyManual(false);
    setLabel("");
    setKey("");
    setType("TEXT");
    setDescription("");
    setIsRequired(false);
    setIsUnique(false);
    setIsPrimary(false);
    setDefaultValue("");
    setCurrency("CZK");
    setPrecision(2);
    setBadgeDisplayType("circle");
    setBadgeFillStyle("subtle");
    setOptions([
      { id: "opt_1", label: "Možnost 1", color: "#3b82f6" },
      { id: "opt_2", label: "Možnost 2", color: "#10b981" },
    ]);
  };

  // Automatické předvyplnění systémového klíče při psaní názvu
  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!editingColId && !isKeyManual) {
      const existingKeys = new Set(columns.map((c) => c.key));
      const autoKey = slugifyColumnKey(val);
      setKey(generateUniqueColumnKey(autoKey, existingKeys));
    }
  };

  // Přidání možnosti do Selectu
  const handleAddOption = () => {
    const nextIndex = options.length + 1;
    const nextColor = colorPalette[options.length % colorPalette.length];
    setOptions([
      ...options,
      {
        id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        label: `Položka ${nextIndex}`,
        color: nextColor,
      },
    ]);
  };

  // Smazání možnosti ze Selectu
  const handleRemoveOption = (id: string, index: number) => {
    setOptions(options.filter((o, idx) => (o.id && id ? o.id !== id : idx !== index)));
  };

  // Uložení sloupce (nový nebo editace)
  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setSaving(true);
    setSuccessMsg(null);

    const configPayload: Record<string, unknown> = {};
    if (type === "CURRENCY") {
      configPayload.currency = currency;
      configPayload.precision = precision;
    } else if (type === "SELECT") {
      configPayload.options = options;
      configPayload.badgeDisplayType = badgeDisplayType;
      configPayload.badgeShape = badgeDisplayType === "square" ? "square" : badgeDisplayType === "circle" ? "circle" : "none";
      configPayload.badgeStyle = badgeDisplayType === "badge" ? badgeFillStyle : "dot";
    }

    try {
      if (editingColId) {
        // Update existujícího sloupce
        const res = await fetch(`/api/tables/${table.id}/columns/${editingColId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            description,
            isRequired,
            isUnique,
            isPrimary,
            defaultValue,
            config: configPayload,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setColumns(columns.map((c) => (c.id === editingColId ? data.column : c)));
          setSuccessMsg("Sloupec byl úspěšně upraven!");
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } else {
        // Vytvoření nového sloupce
        const res = await fetch(`/api/tables/${table.id}/columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            key: key || undefined,
            type,
            description,
            isRequired,
            isUnique,
            isPrimary,
            defaultValue,
            config: configPayload,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setColumns([...columns, data.column]);
          setSuccessMsg("Nový sloupec byl úspěšně přidán do tabulky!");
          handleStartNewColumn();
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Smazání sloupce
  const handleDeleteColumn = async (colId: string) => {
    const isConfirmed = await confirm({
      title: "Smazat sloupec?",
      message: "Opravdu chcete smazat tento sloupec? Data uložená v tomto sloupci budou u všech záznamů trvale odstraněna.",
      confirmText: "Smazat sloupec",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      await fetch(`/api/tables/${table.id}/columns/${colId}`, { method: "DELETE" });
      setColumns(columns.filter((c) => c.id !== colId));
      if (editingColId === colId) {
        handleStartNewColumn();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Horní ovládací lišta */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/${workspaceSlug}/${appId}/${table.id}`}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            title="Zpět do tabulky"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 shrink-0" />
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Správa sloupců tabulky: {currentTableName}
              </h1>
              <button
                type="button"
                onClick={() => setShowEditTableModal(true)}
                className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
                title="Přejmenovat tabulku nebo změnit její ikonu"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Přejmenovat a ikona</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Konfigurace polí, datových typů, výchozích hodnot a validačních pravidel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${workspaceSlug}/${appId}/${table.id}?openFormattingModal=true`}
            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Palette className="w-3.5 h-3.5 text-amber-600" />
            Podmíněné formátování
          </Link>
          <Link
            href={`/${workspaceSlug}/${appId}/${table.id}`}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            Otevřít tabulku
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-6 py-2 flex items-center gap-2 font-medium">
          <Check className="w-3.5 h-3.5 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Dvousloupcový layout: Vlevo seznam sloupců, Vpravo detailní konfigurátor */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* LEVÝ PANEL: Seznam existujících sloupců */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Existující sloupce ({columns.length})
            </span>
            <button
              onClick={handleStartNewColumn}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> + Nový sloupec
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {columns.map((col, index) => {
              const isSelected = editingColId === col.id;
              const isDragging = draggedColId === col.id;
              const isDragOver = dragOverColId === col.id;

              return (
                <div
                  key={col.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.id)}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleSelectColumnForEdit(col)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                    isDragging
                      ? "opacity-30 border-2 border-dashed border-blue-400 bg-blue-50"
                      : isDragOver
                      ? "border-t-2 border-blue-600 bg-blue-50/60"
                      : isSelected
                      ? "bg-blue-50/90 border border-blue-200 shadow-sm"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {/* Úchyt pro drag & drop */}
                    <div
                      className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 rounded shrink-0 transition-colors"
                      title="Přetažením myší změníte pořadí sloupce"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="overflow-hidden space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {col.label}
                        </span>
                        {col.isPrimary && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                            Primární
                          </span>
                        )}
                        {col.isRequired && (
                          <span className="text-red-500 font-bold text-[10px]" title="Povinné pole">
                            *
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span className="truncate">{col.key}</span>
                        <span>•</span>
                        <span className="uppercase text-slate-500 font-semibold">{col.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* Tlačítka pro posun nahoru a dolů */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => handleMoveUp(index, e)}
                        title="Posunout sloupec nahoru"
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === columns.length - 1}
                        onClick={(e) => handleMoveDown(index, e)}
                        title="Posunout sloupec dolů"
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteColumn(col.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Smazat sloupec"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PRAVÝ PANEL: Detailní formulář konfigurace sloupce */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-50 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleSaveColumn} className="space-y-6 max-w-2xl">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  {editingColId ? `Úprava sloupce: ${label}` : "Přidat nový sloupec do tabulky"}
                </h2>
                {editingColId && (
                  <button
                    type="button"
                    onClick={handleStartNewColumn}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    + Přejít na přidání nového
                  </button>
                )}
              </div>

              {/* 1. Základní nastavení */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Název sloupce (Label) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="např. Telefonní číslo, IČO..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Systémový identifikátor (Key)
                    </label>
                    {!editingColId && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsKeyManual(false);
                          const existingKeys = new Set(columns.map((c) => c.key));
                          setKey(generateUniqueColumnKey(slugifyColumnKey(label), existingKeys));
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Vygenerovat klíč automaticky z názvu"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Generovat z názvu
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!!editingColId}
                    value={key}
                    onChange={(e) => {
                      const v = e.target.value;
                      setKey(v);
                      setIsKeyManual(!!v.trim());
                    }}
                    placeholder="fld_telefon"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono bg-slate-50 disabled:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Unikátní identifikátor pole v databázi a API (např. <code>fld_telefon</code>)
                  </p>
                </div>
              </div>

              {/* 2. Datový typ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Datový typ pole <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: "TEXT", lbl: "Krátký text", icon: Type },
                    { val: "LONG_TEXT", lbl: "Dlouhý text (poznámka)", icon: AlignLeft },
                    { val: "NUMBER", lbl: "Číslo", icon: Hash },
                    { val: "CURRENCY", lbl: "Měna", icon: Coins },
                    { val: "DATE", lbl: "Datum", icon: Calendar },
                    { val: "SELECT", lbl: "Výběr (Dropdown)", icon: ListFilter },
                    { val: "CHECKBOX", lbl: "Přepínač (Ano/Ne)", icon: CheckSquare },
                    { val: "FILE", lbl: "Soubor / Dokument (PDF, atd.)", icon: Paperclip },
                    { val: "IMAGE", lbl: "Obrázek (Miniatura)", icon: ImageIcon },
                    { val: "URL", lbl: "Webový odkaz (URL)", icon: Globe },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = type === item.val;

                    return (
                      <button
                        type="button"
                        key={item.val}
                        disabled={!!editingColId}
                        onClick={() => setType(item.val)}
                        className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2 transition-all ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500/20"
                            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                        } disabled:opacity-80`}
                      >
                        <IconComponent className="w-4 h-4 shrink-0 text-slate-500" />
                        <span className="truncate">{item.lbl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Popis a nápověda */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Popis a nápověda pro uživatele
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="např. Zadejte telefonní číslo ve formátu +420..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 4. Výchozí hodnota */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Výchozí hodnota (Default value)
                </label>
                <input
                  type="text"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder="Automaticky předvyplněná hodnota při vytvoření řádku"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 5. Specifická konfigurace dle typu (Měna / Select) */}
              {type === "CURRENCY" && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-700">Formát měny</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Měna</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white"
                      >
                        <option value="CZK">CZK (Kč)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Počet desetinných míst
                      </label>
                      <select
                        value={precision}
                        onChange={(e) => setPrecision(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white"
                      >
                        <option value={0}>0 (Celá čísla)</option>
                        <option value={2}>2 desetinná místa</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {type === "SELECT" && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  {/* Styl zobrazení štítků */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">Styl zobrazení v tabulce</span>
                    <div className="grid grid-cols-3 gap-2">
                      {/* 1. Odrážka kruh */}
                      <button
                        type="button"
                        onClick={() => setBadgeDisplayType("circle")}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          badgeDisplayType === "circle"
                            ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-2xs" />
                          <span>Ukázka</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">Odrážka kruh</span>
                      </button>

                      {/* 2. Odrážka čtverec */}
                      <button
                        type="button"
                        onClick={() => setBadgeDisplayType("square")}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          badgeDisplayType === "square"
                            ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800">
                          <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500 shrink-0 shadow-2xs" />
                          <span>Ukázka</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">Odrážka čtverec</span>
                      </button>

                      {/* 3. Pozadí štítku */}
                      <button
                        type="button"
                        onClick={() => setBadgeDisplayType("badge")}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          badgeDisplayType === "badge"
                            ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            badgeFillStyle === "fill"
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                          }`}
                        >
                          {badgeFillStyle !== "fill" && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                          <span>Ukázka</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">Pozadí štítku</span>
                      </button>
                    </div>

                    {/* Výběr varianty podbarvení při zvoleném Pozadí štítku */}
                    {badgeDisplayType === "badge" && (
                      <div className="flex items-center gap-2 pt-1 pl-0.5">
                        <span className="text-[11px] text-slate-500 font-medium">Varianta štítku:</span>
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white text-xs">
                          <button
                            type="button"
                            onClick={() => setBadgeFillStyle("subtle")}
                            className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                              badgeFillStyle === "subtle"
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Jemné podbarvení
                          </button>
                          <button
                            type="button"
                            onClick={() => setBadgeFillStyle("fill")}
                            className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                              badgeFillStyle === "fill"
                                ? "bg-blue-600 text-white font-semibold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Plná výplň
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-200/80 my-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Možnosti výběru a barvy štítků</span>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Přidat možnost
                    </button>
                  </div>

                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div key={opt.id ? `opt-${opt.id}` : `opt-idx-${idx}`} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={opt.color}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[idx].color = e.target.value;
                            setOptions(newOpts);
                          }}
                          className="w-7 h-7 rounded border border-slate-300 p-0.5 cursor-pointer bg-white"
                        />
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[idx].label = e.target.value;
                            setOptions(newOpts);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id, idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Pravidla a validace */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700">Pravidla a chování pole</span>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>
                      <strong>Povinné pole:</strong> uživatel nemůže uložit záznam bez vyplnění této hodnoty
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnique}
                      onChange={(e) => setIsUnique(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>
                      <strong>Unikátní hodnota:</strong> hodnota se nesmí v tabulce opakovat (např. IČO, kód položky)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>
                      <strong>Primární pole:</strong> slouží jako hlavní název záznamu při vazbách na jiné tabulky
                    </span>
                  </label>
                </div>
              </div>

              {/* Tlačítka uložení */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/${workspaceSlug}/${appId}/${table.id}`}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Zrušit a zpět do tabulky
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingColId ? "Uložit změny sloupce" : "Vytvořit sloupec"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showEditTableModal && (
        <EditTableModal
          isOpen={showEditTableModal}
          onClose={() => setShowEditTableModal(false)}
          table={{
            id: table.id,
            name: currentTableName,
            singularName: currentTableSingular,
            icon: currentTableIcon,
          }}
          onSuccess={(updated) => {
            setCurrentTableName(updated.name);
            setCurrentTableSingular(updated.singularName);
            setCurrentTableIcon(updated.icon);
            setSuccessMsg("Tabulka byla úspěšně přejmenována!");
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}
    </div>
  );
}
