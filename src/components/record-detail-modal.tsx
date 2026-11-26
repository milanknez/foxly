"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Save,
  Printer,
  Copy,
  Trash2,
  Calendar,
  Hash,
  Type,
  AlignLeft,
  CheckSquare,
  DollarSign,
  Tag,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Clock,
  User,
  Image as ImageIcon,
  Globe,
  Upload,
  Eye,
} from "lucide-react";
import SelectBadge, { SelectOption } from "./select-badge";
import DateCell from "./date-cell";
import { formatDateTime } from "@/lib/utils";
import { useDialog } from "@/components/ui/dialog-provider";

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

interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RecordItem | null;
  table: TableData;
  columns: Column[];
  workspaceSlug: string;
  appId: string;
  badgeShape?: "circle" | "square";
  readOnly?: boolean;
  onSave: (recordId: string, updatedData: Record<string, unknown>) => Promise<void>;
  onDuplicate?: (recordId: string) => void;
  onDelete?: (recordId: string) => void;
}

export default function RecordDetailModal({
  isOpen,
  onClose,
  record,
  table,
  columns,
  workspaceSlug,
  appId,
  badgeShape = "circle",
  readOnly = false,
  onSave,
  onDuplicate,
  onDelete,
}: RecordDetailModalProps) {
  const { confirm, alert } = useDialog();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "audit">("fields");

  useEffect(() => {
    if (record) {
      setFormData({ ...record.data });
    } else {
      setFormData({});
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const primaryCol = columns.find((c) => c.isPrimary) || columns[0];
  const recordTitle = String(formData[primaryCol?.key] || "Detail záznamu");

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(record.id, formData);
      onClose();
    } catch (err) {
      console.error(err);
      await alert("Chyba při ukládání záznamu.");
    } finally {
      setSaving(false);
    }
  };

  // Vykreslení ikony podle typu sloupce
  const getColIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return <Type className="w-3.5 h-3.5 text-blue-500" />;
      case "LONG_TEXT":
        return <AlignLeft className="w-3.5 h-3.5 text-indigo-500" />;
      case "NUMBER":
        return <Hash className="w-3.5 h-3.5 text-emerald-500" />;
      case "CURRENCY":
        return <DollarSign className="w-3.5 h-3.5 text-amber-500" />;
      case "DATE":
        return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      case "CHECKBOX":
        return <CheckSquare className="w-3.5 h-3.5 text-teal-500" />;
      case "IMAGE":
      case "FILE":
        return <ImageIcon className="w-3.5 h-3.5 text-pink-500" />;
      case "URL":
        return <Globe className="w-3.5 h-3.5 text-cyan-500" />;
      case "SELECT":
        return <Tag className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Type className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* 1. HLAVIČKA MODÁLU */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1e60f0] font-bold flex items-center justify-center shrink-0 shadow-xs">
              <Type className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {recordTitle}
                </h2>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  ID: {record.id.slice(0, 8)}
                </span>
                {record.source === "OCR" && (
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                    OCR Faktura
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tabulka: <strong className="text-slate-700">{table.name}</strong> • Vytvořeno:{" "}
                {formatDateTime(record.createdAt)}
              </p>
            </div>
          </div>

          {/* Akční tlačítka v hlavičce */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/${workspaceSlug}/${appId}/${table.id}/record/${record.id}`}
              title="Otevřít tiskovou šablonu (Faktura / Karta A4)"
              className="p-2 text-slate-600 hover:text-[#1e60f0] hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </Link>

            {onDuplicate && (
              <button
                type="button"
                onClick={() => onDuplicate(record.id)}
                title="Duplikovat tento záznam"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            {!readOnly && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  const isConfirmed = await confirm({
                    title: "Smazat záznam?",
                    message: "Opravdu si přejete smazat tento záznam? Tato akce je nevratná.",
                    confirmText: "Smazat",
                    variant: "danger",
                  });
                  if (isConfirmed) {
                    onDelete(record.id);
                    onClose();
                  }
                }}
                title="Smazat záznam"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Zavřít"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. PŘEPÍNAČ ZÁLOŽEK */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "fields"
                ? "border-[#1e60f0] text-[#1e60f0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Pole a hodnoty
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "audit"
                ? "border-[#1e60f0] text-[#1e60f0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Historie & Systémová data
          </button>
        </div>

        {/* 3. TĚLO MODÁLU S FORMULÁŘEM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
          {readOnly && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0 text-amber-600" />
              <span><strong>Režim pouze pro čtení:</strong> Nemáte oprávnění upravovat záznamy v této tabulce.</span>
            </div>
          )}

          {activeTab === "fields" ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${readOnly ? "pointer-events-none opacity-80" : ""}`}>
              {columns.map((col) => {
                const val = formData[col.key];
                const isFullWidth = col.type === "LONG_TEXT";
                const options = Array.isArray(col.config?.options)
                  ? (col.config.options as SelectOption[])
                  : [];

                return (
                  <div
                    key={col.id}
                    className={`space-y-1.5 ${isFullWidth ? "md:col-span-2" : ""}`}
                  >
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      {getColIcon(col.type)}
                      <span>{col.label}</span>
                      {col.isRequired && (
                        <span className="text-rose-500 font-bold">*</span>
                      )}
                      {col.isPrimary && (
                        <span className="text-[10px] bg-blue-50 text-[#1e60f0] px-1 py-0.2 rounded font-normal">
                          Primární
                        </span>
                      )}
                    </label>

                    {/* Vykreslení vstupu podle datového typu */}
                    {col.type === "SELECT" ? (
                      <div className="pt-0.5">
                        <SelectBadge
                          value={String(val || "")}
                          options={options}
                          badgeDisplayType={(col.config as any)?.badgeDisplayType}
                          badgeShape={(col.config as any)?.badgeShape || badgeShape}
                          badgeStyle={(col.config as any)?.badgeStyle || "subtle"}
                          onChange={(newVal) => handleFieldChange(col.key, newVal)}
                          className="w-full justify-between py-2 px-3 text-xs"
                        />
                      </div>
                    ) : col.type === "CHECKBOX" ? (
                      <div className="flex items-center gap-3 pt-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!val}
                            onChange={(e) =>
                              handleFieldChange(col.key, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e60f0]"></div>
                        </label>
                        <span className="text-xs font-medium text-slate-600">
                          {val ? "Ano" : "Ne"}
                        </span>
                      </div>
                    ) : col.type === "LONG_TEXT" ? (
                      <textarea
                        rows={3}
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(e) =>
                          handleFieldChange(col.key, e.target.value)
                        }
                        placeholder={`Zadejte ${col.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0] transition-colors"
                      />
                    ) : col.type === "DATE" ? (
                      <DateCell
                        variant="form"
                        value={val}
                        onChange={(newVal) =>
                          handleFieldChange(col.key, newVal)
                        }
                      />
                    ) : col.type === "CURRENCY" || col.type === "NUMBER" ? (
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={val !== undefined && val !== null ? String(val) : ""}
                          onChange={(e) =>
                            handleFieldChange(
                              col.key,
                              e.target.value ? Number(e.target.value) : ""
                            )
                          }
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0] font-mono transition-colors"
                        />
                        {col.type === "CURRENCY" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Kč
                          </span>
                        )}
                      </div>
                    ) : col.type === "IMAGE" || col.type === "FILE" ? (
                      <div className="space-y-2">
                        {val ? (
                          <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden bg-slate-50 group">
                            <img
                              src={String(val)}
                              alt={col.label}
                              className="max-h-48 max-w-full object-contain rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleFieldChange(col.key, "")}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md shadow-xs transition-colors cursor-pointer"
                              title="Odstranit obrázek"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={val !== undefined && val !== null ? String(val) : ""}
                            onChange={(e) => handleFieldChange(col.key, e.target.value)}
                            placeholder="Vložte URL obrázku (https://...)"
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0]"
                          />
                          <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200 flex items-center gap-1 shrink-0 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Nahrát</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const r = new FileReader();
                                  r.onload = () => handleFieldChange(col.key, r.result);
                                  r.readAsDataURL(f);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : col.type === "URL" ? (
                      <div className="relative flex items-center">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          type="url"
                          value={val !== undefined && val !== null ? String(val) : ""}
                          onChange={(e) => handleFieldChange(col.key, e.target.value)}
                          placeholder="https://..."
                          className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0] transition-colors"
                        />
                        {Boolean(val && typeof val === "string") && (
                          <a
                            href={String(val)}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute right-2.5 text-blue-600 hover:text-blue-800"
                            title="Otevřít odkaz"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(e) =>
                          handleFieldChange(col.key, e.target.value)
                        }
                        placeholder={`Zadejte ${col.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e60f0]/30 focus:border-[#1e60f0] transition-colors"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ZÁLOŽKA SYSTÉMOVÝCH INFORMACÍ */
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Unikátní ID:</span>
                  <span className="font-mono text-slate-800">{record.id}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Zdroj dat:</span>
                  <span className="font-semibold text-slate-800">{record.source}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Datum vytvoření:</span>
                  <span className="text-slate-800">{formatDateTime(record.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Tisková šablona:</span>
                  <Link
                    href={`/${workspaceSlug}/${appId}/${table.id}/record/${record.id}`}
                    className="text-[#1e60f0] hover:underline flex items-center gap-1 font-semibold"
                  >
                    Otevřít tiskovou sestavu A4 <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 4. PATIČKA S TLAČÍTKY */}
          <div className="pt-6 mt-6 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {readOnly ? "Záznam je chráněn proti úpravám nastavením oprávnění" : "Všechna data se po uložení propíšou do databáze"}
            </span>
            <div className="flex items-center gap-2">
              {readOnly ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Zavřít
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#1e60f0] hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Ukládám...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Uložit změny
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
