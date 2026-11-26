"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Save, Search, Table as TableIcon } from "lucide-react";
import { TABLE_ICON_LIST, getTableIcon } from "@/lib/table-icons";
import { useDialog } from "@/components/ui/dialog-provider";

export interface EditTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: {
    id: string;
    name: string;
    singularName?: string;
    icon?: string;
  };
  onSuccess?: (updated: { name: string; singularName: string; icon: string }) => void;
}

export default function EditTableModal({
  isOpen,
  onClose,
  table,
  onSuccess,
}: EditTableModalProps) {
  const router = useRouter();
  const { alert } = useDialog();

  const [name, setName] = useState(table.name || "");
  const [singularName, setSingularName] = useState(table.singularName || "");
  const [icon, setIcon] = useState(table.icon || "Table");
  const [iconSearch, setIconSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(table.name || "");
      setSingularName(table.singularName || "");
      setIcon(table.icon || "Table");
      setIconSearch("");
    }
  }, [isOpen, table]);

  if (!isOpen) return null;

  const filteredIcons = TABLE_ICON_LIST.filter((i) =>
    i.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
    i.key.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const SelectedIconComponent = getTableIcon(icon);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      await alert("Zadejte prosím název tabulky.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          singularName: singularName.trim() || name.trim(),
          icon,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nepodařilo se aktualizovat tabulku.");
      }

      const updated = {
        name: name.trim(),
        singularName: singularName.trim() || name.trim(),
        icon,
      };

      if (onSuccess) {
        onSuccess(updated);
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      await alert(err instanceof Error ? err.message : "Chyba při ukládání tabulky.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Hlavička modálu */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <SelectedIconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Nastavení a přejmenování tabulky
              </h3>
              <p className="text-[11px] text-slate-500">
                Upravte název, jednotné číslo a ikonu tabulky
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulář */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Živý náhled */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <SelectedIconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Náhled v aplikaci
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {name.trim() || "Název tabulky"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Jednotné číslo: {singularName.trim() || name.trim() || "—"}
              </div>
            </div>
          </div>

          {/* Název tabulky */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Název tabulky (množné číslo) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Zakázky, Vozidla, Dodavatelé"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jednotné číslo (pro formulář)
              </label>
              <input
                type="text"
                value={singularName}
                onChange={(e) => setSingularName(e.target.value)}
                placeholder="např. Zakázka, Vozidlo"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Výběr ikony */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Vyberte ikonu tabulky
              </label>
              <span className="text-[10px] text-slate-400">
                Vybráno: <strong className="text-slate-700">{icon}</strong>
              </span>
            </div>

            {/* Vyhledávání v ikonách */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Filtrovat ikony (např. auto, firma, faktura, sklad)..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Mřížka ikon */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
              {filteredIcons.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = icon === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIcon(item.key)}
                    className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1 font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                    title={item.label}
                  >
                    <ItemIcon className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] truncate w-full leading-tight opacity-90">
                      {item.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patička tlačítek */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ukládám...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Uložit změny tabulky</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
