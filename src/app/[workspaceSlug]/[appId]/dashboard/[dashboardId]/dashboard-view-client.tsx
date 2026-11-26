"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  BarChart3,
  Table as TableIcon,
  Layers,
  ArrowUpRight,
  ArrowUpDown,
  Filter,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Hash,
  Clock,
  Edit2,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import DashboardCharts from "./dashboard-charts";
import { useDialog } from "@/components/ui/dialog-provider";

interface ColumnItem {
  id: string;
  key: string;
  label: string;
  type: string;
  config?: any;
}

interface RecordItem {
  id: string;
  tableId: string;
  data: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TableWithData {
  id: string;
  name: string;
  singularName?: string | null;
  columns: ColumnItem[];
  records: RecordItem[];
}

interface WidgetItem {
  id: string;
  dashboardId: string;
  tableId: string;
  title: string;
  type: string; // KPI_METRIC, TABLE_PREVIEW, BAR_CHART
  targetField?: string | null;
  aggregation?: string | null; // COUNT, SUM, AVG, MIN, MAX
  groupField?: string | null;
  config?: any;
  sortOrder: number;
  table: TableWithData;
}

interface DashboardData {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  icon: string;
  widgets: WidgetItem[];
}

export default function DashboardViewClient({
  workspaceSlug,
  appId,
  dashboard,
  tables,
}: {
  workspaceSlug: string;
  appId: string;
  dashboard: DashboardData;
  tables: TableWithData[];
}) {
  const router = useRouter();
  const { confirm, alert } = useDialog();

  const [isDeletingDashboard, setIsDeletingDashboard] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [deletingWidgetId, setDeletingWidgetId] = useState<string | null>(null);

  // Editace názvu dashboardu in-place
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [dashboardTitle, setDashboardTitle] = useState(dashboard.name);
  const [dashboardDesc, setDashboardDesc] = useState(dashboard.description || "");
  const [savingTitle, setSavingTitle] = useState(false);

  // Formulář pro nový widget
  const [widgetType, setWidgetType] = useState<"KPI_METRIC" | "TABLE_PREVIEW" | "BAR_CHART">("KPI_METRIC");
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || "");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [aggregation, setAggregation] = useState<string>("COUNT");
  const [targetField, setTargetField] = useState<string>("");
  const [groupField, setGroupField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [rowLimit, setRowLimit] = useState<number>(10);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [isCurrency, setIsCurrency] = useState<boolean>(true);
  const [customSuffix, setCustomSuffix] = useState<string>("");
  const [cardColor, setCardColor] = useState<string>("blue");
  const [submittingWidget, setSubmittingWidget] = useState(false);

  // Najdeme právě zvolenou tabulku ve formuláři
  const currentFormTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  // Při změně tabulky předvybrat vhodné sloupce
  const handleTableChange = (newTableId: string) => {
    setSelectedTableId(newTableId);
    const tbl = tables.find((t) => t.id === newTableId);
    if (tbl) {
      const numCol = tbl.columns.find((c) => ["NUMBER", "CURRENCY"].includes(c.type));
      if (numCol) setTargetField(numCol.key);
      else setTargetField("");

      const grpCol = tbl.columns.find((c) => ["SELECT", "STATUS", "TEXT"].includes(c.type));
      if (grpCol) setGroupField(grpCol.key);
      else setGroupField("");

      // Výchozí vybrané sloupce pro tabulku
      setSelectedColumnKeys(tbl.columns.slice(0, 4).map((c) => c.key));
    }
  };

  // Otevření modálu s čistým stavem
  const handleOpenAddWidget = (presetType?: "KPI_METRIC" | "TABLE_PREVIEW" | "BAR_CHART", presetAgg?: string) => {
    const defaultTbl = tables[0];
    const initialType = presetType || "KPI_METRIC";
    setWidgetType(initialType);
    if (defaultTbl) {
      setSelectedTableId(defaultTbl.id);
      const numCol = defaultTbl.columns.find((c) => ["NUMBER", "CURRENCY"].includes(c.type));
      if (numCol) setTargetField(numCol.key);
      else setTargetField("");

      const grpCol = defaultTbl.columns.find((c) => ["SELECT", "STATUS", "TEXT"].includes(c.type));
      if (grpCol) setGroupField(grpCol.key);
      else setGroupField("");

      setSelectedColumnKeys(defaultTbl.columns.slice(0, 4).map((c) => c.key));
    }

    if (presetAgg) {
      setAggregation(presetAgg);
      if (presetAgg === "COUNT") {
        setWidgetTitle(`Počet záznamů (${defaultTbl?.name || ""})`);
      } else if (presetAgg === "SUM") {
        setWidgetTitle(`Celkový součet (${defaultTbl?.name || ""})`);
      }
    } else if (initialType === "TABLE_PREVIEW") {
      setWidgetTitle(`TOP 10 záznamů (${defaultTbl?.name || ""})`);
    } else if (initialType === "BAR_CHART") {
      setWidgetTitle(`Přehled podle kategorií`);
    } else {
      setWidgetTitle("");
    }

    setShowAddWidgetModal(true);
  };

  // Uložení nového widgetu
  const handleCreateWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId || !widgetTitle.trim()) return;

    setSubmittingWidget(true);
    try {
      const config: any = {};
      if (widgetType === "KPI_METRIC") {
        config.currency = isCurrency;
        config.suffix = customSuffix;
        config.color = cardColor;
      } else if (widgetType === "TABLE_PREVIEW") {
        config.limit = Number(rowLimit) || 10;
        config.sortDirection = sortDirection;
        config.selectedColumns = selectedColumnKeys.length > 0 ? selectedColumnKeys : undefined;
      }

      const res = await fetch(`/api/dashboards/${dashboard.id}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          title: widgetTitle.trim(),
          type: widgetType,
          aggregation: widgetType === "KPI_METRIC" ? aggregation : aggregation || "COUNT",
          targetField: targetField || null,
          groupField: groupField || null,
          config,
        }),
      });

      if (res.ok) {
        setShowAddWidgetModal(false);
        router.refresh();
      } else {
        const data = await res.json();
        await alert(data.error || "Nepodařilo se vytvořit widget.");
      }
    } catch (err) {
      console.error(err);
      await alert("Chyba při komunikaci se serverem.");
    } finally {
      setSubmittingWidget(false);
    }
  };

  // Smazání widgetu
  const handleDeleteWidget = async (widgetId: string, title: string) => {
    const isConfirmed = await confirm({
      title: `Smazat widget "${title}"?`,
      message: `Opravdu si přejete odebrat tento widget z dashboardu?`,
      confirmText: "Smazat widget",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setDeletingWidgetId(widgetId);
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}/widgets/${widgetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        await alert("Nepodařilo se smazat widget.");
      }
    } catch (err) {
      console.error(err);
      await alert("Chyba při mazání widgetu.");
    } finally {
      setDeletingWidgetId(null);
    }
  };

  // Smazání celého dashboardu
  const handleDeleteDashboard = async () => {
    const isConfirmed = await confirm({
      title: `Smazat dashboard "${dashboard.name}"?`,
      message: `Opravdu chcete smazat celý dashboard "${dashboard.name}"? Tato akce smaže všechny jeho widgety a je nevratná.`,
      confirmText: "Smazat dashboard",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setIsDeletingDashboard(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Přesměrovat na první tabulku nebo do aplikace
        if (tables.length > 0) {
          router.push(`/${workspaceSlug}/${appId}/${tables[0].id}`);
        } else {
          router.push(`/${workspaceSlug}/${appId}`);
        }
        router.refresh();
      } else {
        await alert("Nepodařilo se smazat dashboard.");
      }
    } catch (err) {
      console.error(err);
      await alert("Chyba při mazání dashboardu.");
    } finally {
      setIsDeletingDashboard(false);
    }
  };

  // Uložení názvu dashboardu
  const handleSaveTitle = async () => {
    if (!dashboardTitle.trim()) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dashboardTitle.trim(),
          description: dashboardDesc.trim() || null,
        }),
      });
      if (res.ok) {
        setIsEditingTitle(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTitle(false);
    }
  };

  // Výpočet hodnot pro jednotlivé widgety
  const kpiWidgets = dashboard.widgets.filter((w) => w.type === "KPI_METRIC");
  const tableWidgets = dashboard.widgets.filter((w) => w.type === "TABLE_PREVIEW" || w.type === "SUMMARY_TABLE");
  const chartWidgets = dashboard.widgets.filter((w) => w.type === "BAR_CHART");

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* 1. HLAVIČKA DASHBOARDU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          {isEditingTitle ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={dashboardTitle}
                  onChange={(e) => setDashboardTitle(e.target.value)}
                  className="px-3 py-1.5 text-lg font-bold border rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  title="Uložit název"
                >
                  {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setDashboardTitle(dashboard.name);
                    setIsEditingTitle(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={dashboardDesc}
                onChange={(e) => setDashboardDesc(e.target.value)}
                placeholder="Volitelný popis dashboardu..."
                className="w-full text-xs px-2.5 py-1 border rounded focus:ring-1 focus:ring-emerald-500 text-slate-600"
              />
            </div>
          ) : (
            <div className="group flex items-start gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-xs mt-0.5">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{dashboard.name}</h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Upravit název"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {dashboard.description || "Analytická nástěnka v reálném čase se součty, počty a tabulkami"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Akční tlačítka v hlavičce */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => handleOpenAddWidget()}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat widget</span>
          </button>

          <button
            onClick={handleDeleteDashboard}
            disabled={isDeletingDashboard}
            title="Smazat dashboard"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {isDeletingDashboard ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. PRÁZDNÝ STAV (Žádné widgety) */}
      {dashboard.widgets.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Tento dashboard je zatím prázdný</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Přidejte si své první přehledové widgety — součty, počty záznamů, zjednodušené tabulky (TOP 10 / LAST 10) nebo sloupcové grafy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-lg mx-auto text-left">
            <button
              onClick={() => handleOpenAddWidget("KPI_METRIC", "COUNT")}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-xs group cursor-pointer"
            >
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 group-hover:text-emerald-700">
                <Hash className="w-4 h-4 text-emerald-600" /> Počet záznamů
              </div>
              <div className="text-[11px] text-slate-500">Počet faktur, poptávek či klientů</div>
            </button>

            <button
              onClick={() => handleOpenAddWidget("KPI_METRIC", "SUM")}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-xs group cursor-pointer"
            >
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 group-hover:text-blue-700">
                <DollarSign className="w-4 h-4 text-blue-600" /> Finanční součet
              </div>
              <div className="text-[11px] text-slate-500">Celkový obrat, částky nebo marže</div>
            </button>

            <button
              onClick={() => handleOpenAddWidget("TABLE_PREVIEW")}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all text-xs group cursor-pointer"
            >
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 group-hover:text-indigo-700">
                <TableIcon className="w-4 h-4 text-indigo-600" /> TOP 10 tabulka
              </div>
              <div className="text-[11px] text-slate-500">Přehled nejvyšších či nejnovějších dat</div>
            </button>
          </div>
        </div>
      )}

      {/* 3. KPI / METRIC KARTY (Součty, počty, průměry) */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {kpiWidgets.map((w, idx) => {
            const records = w.table.records || [];
            const targetKey = w.targetField;
            let resultValue = 0;

            if (w.aggregation === "COUNT") {
              resultValue = records.length;
            } else if (targetKey) {
              const nums = records
                .map((r) => Number((r.data as Record<string, unknown>)?.[targetKey]))
                .filter((n) => !isNaN(n));

              const sum = nums.reduce((acc, curr) => acc + curr, 0);
              if (w.aggregation === "SUM") resultValue = sum;
              else if (w.aggregation === "AVG") resultValue = nums.length > 0 ? sum / nums.length : 0;
              else if (w.aggregation === "MIN") resultValue = nums.length > 0 ? Math.min(...nums) : 0;
              else if (w.aggregation === "MAX") resultValue = nums.length > 0 ? Math.max(...nums) : 0;
            }

            const cfg = w.config || {};
            let formattedValue = "";
            if (cfg.currency || w.aggregation === "SUM") {
              formattedValue = formatCurrency(Math.round(resultValue));
            } else {
              formattedValue = Math.round(resultValue).toLocaleString("cs-CZ");
              if (cfg.suffix) formattedValue += ` ${cfg.suffix}`;
            }

            const colorPresets: Record<string, { bg: string; text: string; border: string }> = {
              blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
              emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
              indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
              amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
              rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
            };
            const activeColor = colorPresets[cfg.color || (idx % 2 === 0 ? "blue" : "emerald")] || colorPresets.blue;

            return (
              <div
                key={w.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group relative"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">
                      {w.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-600">{w.table.name}</span>
                      <span>•</span>
                      <span>
                        {w.aggregation === "COUNT"
                          ? "Počet záznamů"
                          : w.aggregation === "SUM"
                          ? "Součet"
                          : w.aggregation === "AVG"
                          ? "Průměr"
                          : w.aggregation === "MAX"
                          ? "Maximum"
                          : "Minimum"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={`p-2 rounded-xl ${activeColor.bg} ${activeColor.text}`}>
                      {w.aggregation === "COUNT" ? (
                        <Hash className="w-4 h-4" />
                      ) : w.aggregation === "SUM" ? (
                        <DollarSign className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteWidget(w.id, w.title)}
                      disabled={deletingWidgetId === w.id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-600 rounded transition-all cursor-pointer"
                      title="Smazat widget"
                    >
                      {deletingWidgetId === w.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                  {formattedValue}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <Link
                    href={`/${workspaceSlug}/${appId}/${w.table.id}`}
                    className="text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Otevřít tabulku</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                  <span className="text-slate-400 text-[10px]">{records.length} záznamů</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. ZJEDNODUŠENÉ TABULKY (TOP 10, LAST 10) */}
      {tableWidgets.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Přehledové mini-tabulky (TOP / Poslední)</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tableWidgets.map((w) => {
              const records = [...(w.table.records || [])];
              const cfg = w.config || {};
              const sortKey = w.targetField;
              const direction = cfg.sortDirection || "desc";
              const limit = Number(cfg.limit) || 10;

              // Řazení záznamů
              records.sort((a, b) => {
                let valA: any = null;
                let valB: any = null;

                if (!sortKey || sortKey === "createdAt") {
                  valA = new Date(a.createdAt).getTime();
                  valB = new Date(b.createdAt).getTime();
                } else {
                  valA = (a.data as Record<string, any>)?.[sortKey];
                  valB = (b.data as Record<string, any>)?.[sortKey];
                  const numA = Number(valA);
                  const numB = Number(valB);
                  if (!isNaN(numA) && !isNaN(numB)) {
                    valA = numA;
                    valB = numB;
                  }
                }

                if (valA === valB) return 0;
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                return direction === "asc" ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
              });

              const displayedRecords = records.slice(0, limit);

              // Vybrané sloupce pro zobrazení
              const availableCols = w.table.columns || [];
              const selectedCols = Array.isArray(cfg.selectedColumns) && cfg.selectedColumns.length > 0
                ? availableCols.filter((c) => cfg.selectedColumns.includes(c.key))
                : availableCols.slice(0, 4);

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between group overflow-hidden"
                >
                  {/* Hlavička mini-tabulky */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{w.title}</h3>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full border border-indigo-100">
                          {direction === "desc" ? `TOP ${displayedRecords.length}` : `LAST ${displayedRecords.length}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Zdroj: <strong>{w.table.name}</strong> • Řazeno:{" "}
                        {sortKey && sortKey !== "createdAt"
                          ? availableCols.find((c) => c.key === sortKey)?.label || sortKey
                          : "Datum vytvoření"}{" "}
                        ({direction === "desc" ? "sestupně" : "vzestupně"})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${workspaceSlug}/${appId}/${w.table.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <span>Zobrazit vše</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => handleDeleteWidget(w.id, w.title)}
                        disabled={deletingWidgetId === w.id}
                        className="p-1.5 text-slate-300 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Smazat tento widget"
                      >
                        {deletingWidgetId === w.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Obsah mini-tabulky */}
                  <div className="overflow-x-auto flex-1">
                    {displayedRecords.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        Zatím žádné záznamy v tabulce {w.table.name}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 font-semibold">
                            <th className="py-2.5 px-3 w-8 text-center text-slate-400 font-normal">#</th>
                            {selectedCols.map((col) => (
                              <th key={col.key} className="py-2.5 px-3 truncate font-semibold">
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {displayedRecords.map((r, i) => {
                            const data = (r.data as Record<string, any>) || {};
                            return (
                              <tr
                                key={r.id}
                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group/row"
                                onClick={() => router.push(`/${workspaceSlug}/${appId}/${w.table.id}?recordId=${r.id}`)}
                              >
                                <td className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-mono">
                                  {i + 1}
                                </td>
                                {selectedCols.map((col, idx) => {
                                  const rawVal = data[col.key];
                                  let rendered = rawVal !== undefined && rawVal !== null ? String(rawVal) : "—";

                                  if (col.type === "CURRENCY" && !isNaN(Number(rawVal)) && rawVal !== null && rawVal !== "") {
                                    rendered = formatCurrency(Number(rawVal));
                                  } else if (col.type === "DATE" && rawVal) {
                                    try {
                                      rendered = new Date(rawVal).toLocaleDateString("cs-CZ");
                                    } catch {
                                      rendered = String(rawVal);
                                    }
                                  }

                                  return (
                                    <td
                                      key={col.key}
                                      className={`py-2.5 px-3 truncate max-w-[200px] ${
                                        idx === 0 ? "font-bold text-slate-900 group-hover/row:text-blue-600" : ""
                                      }`}
                                    >
                                      {rendered}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Patička */}
                  <div className="p-3 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Zobrazeno {displayedRecords.length} z {records.length} položek</span>
                    <span className="text-[10px] text-slate-400">Kliknutím na řádek otevřete detail</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. GRAFY (BAR CHARTS) */}
      {chartWidgets.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Grafické přehledy</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartWidgets.map((w) => {
              const records = w.table.records || [];
              const groupKey = w.groupField;
              const targetKey = w.targetField;
              const agg = w.aggregation || "COUNT";

              // Seskupení podle groupKey
              const groups: Record<string, number> = {};
              for (const r of records) {
                const data = (r.data as Record<string, unknown>) || {};
                const groupVal = String(groupKey && data[groupKey] ? data[groupKey] : "Ostatní");

                if (agg === "SUM" && targetKey) {
                  const numVal = Number(data[targetKey]) || 0;
                  groups[groupVal] = (groups[groupVal] || 0) + numVal;
                } else {
                  // COUNT
                  groups[groupVal] = (groups[groupVal] || 0) + 1;
                }
              }

              const chartData = Object.entries(groups).map(([name, hodnota]) => ({
                name,
                hodnota: Math.round(hodnota),
              }));

              return (
                <div
                  key={w.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600" /> {w.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tabulka: <strong>{w.table.name}</strong> • Osa:{" "}
                        {groupKey ? w.table.columns.find((c) => c.key === groupKey)?.label || groupKey : "Skupiny"} (
                        {agg === "SUM" ? "Součet" : "Počet"})
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteWidget(w.id, w.title)}
                      disabled={deletingWidgetId === w.id}
                      className="p-1.5 text-slate-300 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title="Smazat graf"
                    >
                      {deletingWidgetId === w.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {chartData.length > 0 ? (
                    <DashboardCharts data={chartData} />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                      Nedostatek dat pro zobrazení grafu
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. MODÁL: PŘIDAT NOVÝ WIDGET */}
      {showAddWidgetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Přidat nový widget na dashboard</h3>
                  <p className="text-[11px] text-slate-500">Vyberte typ zobrazení, tabulku a parametry</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddWidgetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWidget} className="space-y-4 text-xs">
              {/* Volba typu widgetu */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Typ widgetu</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWidgetType("KPI_METRIC");
                      if (!widgetTitle) setWidgetTitle("Metrika");
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      widgetType === "KPI_METRIC"
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-emerald-600 font-bold">
                      <Hash className="w-4 h-4" /> Metrika / Součet
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">Počet, součet částek, průměr</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWidgetType("TABLE_PREVIEW");
                      if (!widgetTitle) setWidgetTitle("TOP 10 záznamů");
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      widgetType === "TABLE_PREVIEW"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-indigo-600 font-bold">
                      <TableIcon className="w-4 h-4" /> Zjednodušená tabulka
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">TOP 10, Poslední záznamy</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWidgetType("BAR_CHART");
                      if (!widgetTitle) setWidgetTitle("Graf podle kategorií");
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      widgetType === "BAR_CHART"
                        ? "border-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-blue-600 font-bold">
                      <BarChart3 className="w-4 h-4" /> Sloupcový graf
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">Rozdělení dle stavu/skupiny</div>
                  </button>
                </div>
              </div>

              {/* Název widgetu */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Název widgetu</label>
                <input
                  type="text"
                  required
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder="např. Celkový obrat, TOP 10 nejvyšších faktur..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Zdrojová tabulka */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Zdrojová tabulka</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => handleTableChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.records?.length || 0} záznamů)
                    </option>
                  ))}
                </select>
              </div>

              {/* Konfigurace pro KPI METRIKU */}
              {widgetType === "KPI_METRIC" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Typ agregace</label>
                      <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="COUNT">Počet záznamů (COUNT)</option>
                        <option value="SUM">Součet hodnot (SUM)</option>
                        <option value="AVG">Průměr hodnot (AVG)</option>
                        <option value="MAX">Nejvyšší hodnota (MAX)</option>
                        <option value="MIN">Nejnižší hodnota (MIN)</option>
                      </select>
                    </div>

                    {aggregation !== "COUNT" && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Číselný sloupec</label>
                        <select
                          value={targetField}
                          onChange={(e) => setTargetField(e.target.value)}
                          className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                        >
                          <option value="">— Vyberte sloupec —</option>
                          {currentFormTable?.columns.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label} ({c.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Barevné schéma karty</label>
                      <select
                        value={cardColor}
                        onChange={(e) => setCardColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="blue">Modrá (Výchozí)</option>
                        <option value="emerald">Smaragdově zelená</option>
                        <option value="indigo">Indigová</option>
                        <option value="amber">Jantarová / Žlutá</option>
                        <option value="rose">Červená / Růžová</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCurrency}
                          onChange={(e) => setIsCurrency(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Formátovat jako měnu (Kč)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Konfigurace pro ZJEDNODUŠENOU TABULKU */}
              {widgetType === "TABLE_PREVIEW" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Řadit podle</label>
                      <select
                        value={targetField}
                        onChange={(e) => setTargetField(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="createdAt">Datum vytvoření</option>
                        {currentFormTable?.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Směr řazení</label>
                      <select
                        value={sortDirection}
                        onChange={(e) => setSortDirection(e.target.value as "desc" | "asc")}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-medium"
                      >
                        <option value="desc">Sestupně (TOP / Nejnovější)</option>
                        <option value="asc">Vzestupně (Nejnižší / Nejstarší)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Počet řádků (Limit)</label>
                      <select
                        value={rowLimit}
                        onChange={(e) => setRowLimit(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value={5}>5 položek</option>
                        <option value={10}>10 položek</option>
                        <option value={15}>15 položek</option>
                        <option value={20}>20 položek</option>
                      </select>
                    </div>
                  </div>

                  {/* Výběr sloupců k zobrazení */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Zobrazené sloupce v mini-tabulce:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white rounded-lg border">
                      {currentFormTable?.columns.map((col) => {
                        const isChecked = selectedColumnKeys.includes(col.key);
                        return (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSelectedColumnKeys(selectedColumnKeys.filter((k) => k !== col.key));
                              } else {
                                setSelectedColumnKeys([...selectedColumnKeys, col.key]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                              isChecked
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <span>{isChecked ? "✓" : "+"}</span>
                            <span>{col.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Konfigurace pro GRAF */}
              {widgetType === "BAR_CHART" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Seskupit dle (Osa X)</label>
                      <select
                        value={groupField}
                        onChange={(e) => setGroupField(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="">— Vyberte sloupec —</option>
                        {currentFormTable?.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label} ({c.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Metrika (Osa Y)</label>
                      <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="COUNT">Počet záznamů v kategorii</option>
                        <option value="SUM">Součet číselného sloupce</option>
                      </select>
                    </div>
                  </div>

                  {aggregation === "SUM" && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <label className="block font-semibold text-slate-700 mb-1">Sloupec pro součet</label>
                      <select
                        value={targetField}
                        onChange={(e) => setTargetField(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="">— Vyberte číselný sloupec —</option>
                        {currentFormTable?.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label} ({c.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Tlačítka modálu */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddWidgetModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={submittingWidget}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {submittingWidget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Vytvořit widget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
