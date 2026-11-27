"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Plus,
  Bookmark,
  Star,
  FileSpreadsheet,
  Download,
  Upload,
  Code2,
  Code,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ExternalLink,
  Copy,
  SlidersHorizontal,
  Palette,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ScanText,
  FileText,
  Paperclip,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calculator,
  Key,
  Printer,
  Receipt,
  Filter,
  Save,
  RotateCcw,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Tag,
  Grid,
  Calendar,
  Kanban,
  List,
  Maximize2,
  HelpCircle,
  Keyboard,
  Flame,
  Leaf,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Globe,
  Image as ImageIcon,
  Settings,
  Share2,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { formatCurrency, formatDate, formatCzechDate, parseCzechDateToIso, slugifyColumnKey, generateUniqueColumnKey } from "@/lib/utils";
import SelectBadge, { SelectOption } from "@/components/select-badge";
import DateCell from "@/components/date-cell";
import RecordDetailModal from "@/components/record-detail-modal";
import KanbanView from "@/components/views/kanban-view";
import CalendarView from "@/components/views/calendar-view";
import WidgetConfigModal, { MetricWidget } from "@/components/widgets/widget-config-modal";
import BulkEditModal from "@/components/bulk-edit-modal";
import ScriptEditorModal from "@/components/script-editor-modal";
import HelpCenterModal from "@/components/help-center-modal";
import ConditionalFormattingModal, { FormattingRule, FORMATTING_PRESETS } from "@/components/conditional-formatting-modal";

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

interface ViewItem {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  isPublic?: boolean;
  shareToken?: string | null;
  config: Record<string, unknown>;
}

interface TableData {
  id: string;
  name: string;
  singularName: string;
  columns: Column[];
  records: RecordItem[];
  views?: ViewItem[];
  automations?: any[];
}

export default function TableViewClient({
  table,
  publicFormShareToken,
  initialFormView,
  workspaceSlug,
  appId,
  userPermissions = {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageSchema: true,
    onlyOwnRecords: false,
    level: "FULL_ACCESS",
    role: "ADMIN",
  },
}: {
  table: TableData;
  publicFormShareToken: string | null;
  initialFormView?: any;
  workspaceSlug: string;
  appId: string;
  userPermissions?: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canManageSchema: boolean;
    onlyOwnRecords: boolean;
    level: string;
    role: string;
  };
}) {
  const { confirm, alert } = useDialog();
  const [records, setRecords] = useState<RecordItem[]>(table.records);
  const [columns, setColumns] = useState<Column[]>(table.columns);
  const [loading, setLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Veřejný formulář (Iframe / Share Form) stavy
  const [shareToken, setShareToken] = useState<string | null>(
    initialFormView?.shareToken || publicFormShareToken || null
  );
  const [isFormPublic, setIsFormPublic] = useState<boolean>(
    Boolean(initialFormView?.isPublic)
  );
  const [formTitle, setFormTitle] = useState<string>(
    (initialFormView?.config as any)?.title || initialFormView?.name || table.name
  );
  const [formDescription, setFormDescription] = useState<string>(
    (initialFormView?.config as any)?.description || "Vyplňte prosím tento formulář."
  );
  const [formFields, setFormFields] = useState<string[]>(
    Array.isArray((initialFormView?.config as any)?.fields)
      ? (initialFormView?.config as any).fields
      : table.columns.map((c) => c.key)
  );
  const [savingFormShare, setSavingFormShare] = useState(false);

  // Podmíněné formátování tabulky
  const [formattingRules, setFormattingRules] = useState<FormattingRule[]>(
    Array.isArray((table.views?.find((v) => v.type === "GRID" && v.isDefault)?.config as any)?.conditionalFormatting)
      ? ((table.views?.find((v) => v.type === "GRID" && v.isDefault)?.config as any).conditionalFormatting as FormattingRule[])
      : []
  );
  const [showFormattingModal, setShowFormattingModal] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(1);
  const [showTotals, setShowTotals] = useState(true);

  // Pohledy a detaily záznamu (Pohled Grid / Kanban / Kalendář & Tvar štítků)
  const [activeView, setActiveView] = useState<"GRID" | "KANBAN" | "CALENDAR">("GRID");
  const [badgeShape, setBadgeShape] = useState<"circle" | "square">("circle");
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<RecordItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Vlastní akční tlačítka nad tabulkou & automatizace
  const [automations, setAutomations] = useState<any[]>(table.automations || []);
  const [executingAutomationId, setExecutingAutomationId] = useState<string | null>(null);

  // Vlastní skriptování & Lightbox obrázků
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Plovoucí Toast notifikace
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  // Rychlé skrývání / zobrazování sloupců v tabulce
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([]);
  const [showColumnVisibilityDropdown, setShowColumnVisibilityDropdown] = useState(false);

  // Změna pořadí sloupců přetažením záhlaví tabulky (Drag & Drop)
  const [draggedColKey, setDraggedColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  const handleHeaderDragStart = (e: React.DragEvent, key: string) => {
    setDraggedColKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };
  const handleHeaderDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColKey !== key) {
      setDragOverColKey(key);
    }
  };
  const handleHeaderDrop = async (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setDragOverColKey(null);
    if (!draggedColKey || draggedColKey === targetKey) {
      setDraggedColKey(null);
      return;
    }

    const sourceIdx = columns.findIndex((c) => c.key === draggedColKey);
    const targetIdx = columns.findIndex((c) => c.key === targetKey);
    if (sourceIdx === -1 || targetIdx === -1) {
      setDraggedColKey(null);
      return;
    }

    const newCols = [...columns];
    const [moved] = newCols.splice(sourceIdx, 1);
    newCols.splice(targetIdx, 0, moved);

    setColumns(newCols);
    setDraggedColKey(null);

    try {
      const columnIds = newCols.map((c) => c.id);
      await fetch(`/api/tables/${table.id}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnIds }),
      });
      showToast("Pořadí sloupců bylo uloženo", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Šířky sloupců (Column Resizing)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const handleResizeMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const thElement = (e.currentTarget.parentElement as HTMLElement);
    const startWidth = thElement ? thElement.offsetWidth : (columnWidths[colKey] || 150);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(70, startWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Správa vlastních pohledů (GRID Views)
  const [tableViews, setTableViews] = useState<ViewItem[]>(() => {
    const gridViews = (table.views || []).filter((v) => v.type === "GRID");
    if (gridViews.length > 0) return gridViews;
    return [
      {
        id: "default-grid-view",
        name: "Výchozí zobrazení",
        type: "GRID",
        isDefault: true,
        config: {},
      },
    ];
  });

  const [activeViewId, setActiveViewId] = useState<string>(() => {
    const gridViews = (table.views || []).filter((v) => v.type === "GRID");
    const def = gridViews.find((v) => v.isDefault) || gridViews[0];
    return def ? def.id : "default-grid-view";
  });

  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewIsDefault, setSaveViewIsDefault] = useState(false);
  const [savingView, setSavingView] = useState(false);

  const activeViewObj = useMemo(() => {
    return tableViews.find((v) => v.id === activeViewId) || tableViews[0];
  }, [tableViews, activeViewId]);

  // Aktivace vybraného pohledu
  const applyView = (view: ViewItem) => {
    setActiveViewId(view.id);
    const cfg = (view.config || {}) as Record<string, any>;

    // 1. Šířky sloupců
    if (cfg.columnWidths && typeof cfg.columnWidths === "object") {
      setColumnWidths(cfg.columnWidths);
    } else {
      setColumnWidths({});
    }

    // 2. Pořadí sloupců
    if (Array.isArray(cfg.columnOrder) && cfg.columnOrder.length > 0) {
      setColumns((prevCols) => {
        const orderMap = new Map(cfg.columnOrder.map((key: string, idx: number) => [key, idx]));
        return [...prevCols].sort((a, b) => {
          const idxA = orderMap.has(a.key) ? (orderMap.get(a.key) as number) : 999;
          const idxB = orderMap.has(b.key) ? (orderMap.get(b.key) as number) : 999;
          return idxA - idxB;
        });
      });
    }

    // 3. Skryté sloupce
    if (Array.isArray(cfg.hiddenColumnKeys)) {
      setHiddenColumnKeys(cfg.hiddenColumnKeys);
    } else {
      setHiddenColumnKeys([]);
    }

    // 4. Řazení
    if (cfg.sortKey !== undefined) {
      setSortKey(cfg.sortKey);
      setSortDirection(cfg.sortDirection || null);
    }

    // 5. Podmíněné formátování
    if (Array.isArray(cfg.conditionalFormatting)) {
      setFormattingRules(cfg.conditionalFormatting);
    } else {
      setFormattingRules([]);
    }

    showToast(`Aktivován pohled "${view.name}"`, "info");
  };

  // Načtení výchozího pohledu při prvním načtení stránky
  useEffect(() => {
    const gridViews = (table.views || []).filter((v) => v.type === "GRID");
    const initial = gridViews.find((v) => v.isDefault) || gridViews[0];
    if (initial && initial.config && Object.keys(initial.config).length > 0) {
      applyView(initial);
    }
  }, []);

  // Otevření modálu pro zveřejnění formuláře nebo podmíněné formátování z URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openShareModal") === "true") {
        setShowIframeModal(true);
      }
      if (params.get("openFormattingModal") === "true") {
        setShowFormattingModal(true);
      }
    }
  }, []);

  // Uložení pravidel podmíněného formátování
  const handleSaveFormattingRules = async (newRules: FormattingRule[]) => {
    setFormattingRules(newRules);
    if (activeViewObj && activeViewObj.id !== "default-grid-view") {
      try {
        const config = {
          ...(activeViewObj.config || {}),
          columnWidths,
          columnOrder: columns.map((c) => c.key),
          hiddenColumnKeys,
          sortKey,
          sortDirection,
          conditionalFormatting: newRules,
        };
        const res = await fetch(`/api/tables/${table.id}/views/${activeViewObj.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        });
        if (res.ok) {
          const data = await res.json();
          setTableViews((prev) =>
            prev.map((v) => (v.id === activeViewObj.id ? data.view : v))
          );
        }
      } catch (e) {
        console.error("Chyba při ukládání formátování do pohledu:", e);
      }
    }
    showToast(`Pravidla podmíněného formátování uložena (${newRules.length})`, "success");
  };

  // Zapnutí / vypnutí veřejného formuláře
  const handleTogglePublicForm = async (newStatus: boolean) => {
    setSavingFormShare(true);
    try {
      const res = await fetch(`/api/tables/${table.id}/public-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: newStatus,
          title: formTitle,
          description: formDescription,
          fields: formFields,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFormPublic(data.isPublic);
        if (data.shareToken) {
          setShareToken(data.shareToken);
        }
        showToast(
          newStatus
            ? "Webový formulář byl úspěšně zveřejněn!"
            : "Zveřejnění webového formuláře bylo zrušeno.",
          "success"
        );
      } else {
        showToast(data.error || "Chyba při změně stavu formuláře", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Chyba spojení se serverem", "error");
    } finally {
      setSavingFormShare(false);
    }
  };

  // Uložení detailního nastavení formuláře (nadpis, popis, pole)
  const handleSaveFormSettings = async () => {
    setSavingFormShare(true);
    try {
      const res = await fetch(`/api/tables/${table.id}/public-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: isFormPublic,
          title: formTitle,
          description: formDescription,
          fields: formFields,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.shareToken) setShareToken(data.shareToken);
        showToast("Nastavení formuláře bylo úspěšně uloženo.", "success");
      } else {
        showToast(data.error || "Chyba při ukládání nastavení", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Chyba spojení se serverem", "error");
    } finally {
      setSavingFormShare(false);
    }
  };

  // Uložení aktuálního pohledu (Quick Save)
  const handleQuickSaveCurrentView = async () => {
    if (!activeViewObj || activeViewObj.id === "default-grid-view") {
      setSaveViewName(activeViewObj?.name || "Moje zobrazení");
      setSaveViewIsDefault(true);
      setShowSaveViewModal(true);
      setShowViewsDropdown(false);
      return;
    }

    setSavingView(true);
    try {
      const config = {
        ...(activeViewObj.config || {}),
        columnWidths,
        columnOrder: columns.map((c) => c.key),
        hiddenColumnKeys,
        sortKey,
        sortDirection,
        conditionalFormatting: formattingRules,
      };

      const res = await fetch(`/api/tables/${table.id}/views/${activeViewObj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (res.ok) {
        const data = await res.json();
        setTableViews((prev) =>
          prev.map((v) => (v.id === activeViewObj.id ? data.view : v))
        );
        showToast(`Nastavení pohledu "${activeViewObj.name}" bylo uloženo!`, "success");
      } else {
        showToast("Chyba při ukládání nastavení pohledu.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Chyba při komunikaci se serverem.", "error");
    } finally {
      setSavingView(false);
      setShowViewsDropdown(false);
    }
  };

  // Vytvoření / uložení jako nový pohled
  const handleSaveAsNewView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveViewName.trim()) return;

    setSavingView(true);
    try {
      const config = {
        columnWidths,
        columnOrder: columns.map((c) => c.key),
        hiddenColumnKeys,
        sortKey,
        sortDirection,
        conditionalFormatting: formattingRules,
      };

      const res = await fetch(`/api/tables/${table.id}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveViewName.trim(),
          type: "GRID",
          isDefault: saveViewIsDefault,
          config,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newView = data.view;
        setTableViews((prev) => {
          const list = saveViewIsDefault ? prev.map((v) => ({ ...v, isDefault: false })) : [...prev];
          return [...list, newView];
        });
        setActiveViewId(newView.id);
        setShowSaveViewModal(false);
        setSaveViewName("");
        showToast(`Pohled "${newView.name}" byl úspěšně uložen!`, "success");
      } else {
        showToast("Chyba při ukládání nového pohledu.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Chyba při komunikaci se serverem.", "error");
    } finally {
      setSavingView(false);
    }
  };

  // Smazání vlastního pohledu
  const handleDeleteView = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const viewToDelete = tableViews.find((v) => v.id === viewId);
    if (!viewToDelete) return;
    const isConfirmed = await confirm({
      title: `Smazat pohled "${viewToDelete.name}"?`,
      message: `Opravdu si přejete smazat tento pohled?`,
      confirmText: "Smazat pohled",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/tables/${table.id}/views/${viewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const remaining = tableViews.filter((v) => v.id !== viewId);
        setTableViews(remaining);
        if (activeViewId === viewId) {
          const next = remaining.find((v) => v.isDefault) || remaining[0];
          if (next) applyView(next);
        }
        showToast("Pohled byl smazán.", "info");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Vyhodnocení stylů podmíněného formátování pro daný záznam
  const getFormattingStyles = (record: RecordItem) => {
    if (!formattingRules || formattingRules.length === 0) {
      return { rowStyle: undefined, cellStyles: {} };
    }

    const data = (record.data || {}) as Record<string, any>;
    let rowStyle: React.CSSProperties | undefined = undefined;
    const cellStyles: Record<string, React.CSSProperties> = {};

    for (const rule of formattingRules) {
      const rawVal = data[rule.fieldKey];
      const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal).trim().toLowerCase() : "";
      const targetVal = (rule.value || "").trim().toLowerCase();

      let matches = false;
      switch (rule.operator) {
        case "EQUALS":
          matches = strVal === targetVal;
          break;
        case "NOT_EQUALS":
          matches = strVal !== targetVal;
          break;
        case "CONTAINS":
          matches = strVal.includes(targetVal);
          break;
        case "NOT_CONTAINS":
          matches = !strVal.includes(targetVal);
          break;
        case "GREATER_THAN": {
          const numA = parseFloat(strVal.replace(/[^0-9.-]/g, ""));
          const numB = parseFloat(targetVal.replace(/[^0-9.-]/g, ""));
          matches = !isNaN(numA) && !isNaN(numB) && numA > numB;
          break;
        }
        case "LESS_THAN": {
          const numA = parseFloat(strVal.replace(/[^0-9.-]/g, ""));
          const numB = parseFloat(targetVal.replace(/[^0-9.-]/g, ""));
          matches = !isNaN(numA) && !isNaN(numB) && numA < numB;
          break;
        }
        case "IS_EMPTY":
          matches = rawVal === null || rawVal === undefined || strVal === "";
          break;
        case "IS_NOT_EMPTY":
          matches = rawVal !== null && rawVal !== undefined && strVal !== "";
          break;
      }

      if (matches) {
        const preset = FORMATTING_PRESETS[rule.color] || FORMATTING_PRESETS.green;
        const style: React.CSSProperties = {
          backgroundColor: preset.bg,
          color: preset.text,
          fontWeight: rule.isBold ? "bold" : undefined,
          textDecoration: rule.isStrikethrough ? "line-through" : undefined,
        };

        if (rule.target === "ROW") {
          rowStyle = { ...(rowStyle || {}), ...style };
        } else if (rule.target === "CELL") {
          const colKey = rule.targetFieldKey || rule.fieldKey;
          cellStyles[colKey] = { ...(cellStyles[colKey] || {}), ...style };
        }
      }
    }

    return { rowStyle, cellStyles };
  };

  const visibleColumns = useMemo(() => {
    return columns.filter((c) => !hiddenColumnKeys.includes(c.key));
  }, [columns, hiddenColumnKeys]);

  useEffect(() => {
    if (table.automations && table.automations.length >= 0) {
      setAutomations(table.automations);
      return;
    }
    const loadAutomations = async () => {
      try {
        const res = await fetch(`/api/tables/${table.id}/automations`);
        if (res.ok) {
          const data = await res.json();
          setAutomations(data.automations || []);
        }
      } catch (err) {
        console.error("Chyba při načítání automatizací:", err);
      }
    };
    loadAutomations();
  }, [table.id, table.automations]);

  const handleExecuteManualAutomation = async (auto: any) => {
    if (selectedRecordIds.length === 0) {
      showToast("Nejprve zaškrtněte v tabulce alespoň jeden řádek pro spuštění workflow.", "info");
      return;
    }

    setExecutingAutomationId(auto.id);
    try {
      const res = await fetch(`/api/automations/${auto.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordIds: selectedRecordIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.skippedCount > 0 && data.successCount === 0) {
          showToast(data.message || `Podmínky workflow "${auto.name}" nebyly u vybraných záznamů splněny.`, "info");
        } else {
          showToast(data.message || `Workflow "${auto.name}" proběhlo úspěšně!`, "success");
        }
        const recRes = await fetch(`/api/tables/${table.id}/records`);
        if (recRes.ok) {
          const rData = await recRes.json();
          setRecords(rData.records || []);
        }
      } else {
        showToast(data.error || "Chyba při spouštění workflow.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Chyba při komunikaci se serverem.", "error");
    } finally {
      setExecutingAutomationId(null);
    }
  };
  // Dynamické Widgety nad tabulkou (KPI Cards / Summary)
  const initialWidgets: MetricWidget[] = useMemo(() => {
    const defaultView = table.views?.find((v) => v.isDefault) || table.views?.[0];
    const savedWidgets =
      defaultView?.config &&
        typeof defaultView.config === "object" &&
        "widgets" in defaultView.config
        ? (defaultView.config as { widgets?: MetricWidget[] }).widgets
        : undefined;

    if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
      // Ignorovat dříve automaticky vkládané demo widgety "NOVÉ" a "ODESLÁNO"
      const userWidgets = savedWidgets.filter(
        (w) => w.id !== "widget-nove" && w.id !== "widget-odeslano"
      );
      return userWidgets;
    }

    // Výchozí stav: žádné widgety
    return [];
  }, [table.views]);

  const [widgets, setWidgets] = useState<MetricWidget[]>(initialWidgets);
  const [isWidgetsCollapsed, setIsWidgetsCollapsed] = useState(true);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<MetricWidget | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);

  const saveWidgetsToBackend = async (newWidgets: MetricWidget[]) => {
    setWidgets(newWidgets);
    try {
      await fetch(`/api/tables/${table.id}/widgets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: newWidgets }),
      });
    } catch (err) {
      console.error("Failed to save widgets", err);
    }
  };
  const handleSaveWidget = (savedWidget: MetricWidget) => {
    const exists = widgets.some((w) => w.id === savedWidget.id);
    const updated = exists
      ? widgets.map((w) => (w.id === savedWidget.id ? savedWidget : w))
      : [...widgets, savedWidget];
    setIsWidgetsCollapsed(false);
    saveWidgetsToBackend(updated);
  };
  const handleDeleteWidget = (widgetId: string) => {
    const updated = widgets.filter((w) => w.id !== widgetId);
    saveWidgetsToBackend(updated);
  };
  const handleMoveWidget = (index: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;
    const updated = [...widgets];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    saveWidgetsToBackend(updated);
  };
  const getWidgetData = (widget: MetricWidget) => {
    if (widget.type === "HTML_SNIPPET" || widget.type === "QUICK_ACTION") {
      return { formatted: "", rawNumber: 0, isCurrency: false };
    }
    let filtered = records;
    if (widget.filterColumnKey && widget.filterValue) {
      const filterKey = widget.filterColumnKey.toLowerCase();
      const filterVal = widget.filterValue.toLowerCase();
      filtered = records.filter((r) => {
        const directVal = r.data[widget.filterColumnKey!];
        let val = directVal !== undefined ? String(directVal) : "";
        if (!val && (filterKey === "stav" || filterKey === "status")) {
          val = String(r.data.stav ?? r.data.status ?? r.data.stav_faktury ?? "");
        }
        return val.toLowerCase().includes(filterVal);
      });
    }

    if (widget.aggregation === "COUNT") {
      return {
        formatted: String(filtered.length),
        rawNumber: filtered.length,
        isCurrency: false,
      };
    }

    if (!widget.targetColumnKey) return { formatted: "0", rawNumber: 0, isCurrency: false };
    const col = columns.find((c) => c.key === widget.targetColumnKey);
    const isCurrency = col?.type === "CURRENCY";

    const numbers = filtered
      .map((r) => Number(r.data[widget.targetColumnKey!]))
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      return {
        formatted: isCurrency ? "0 Kč" : "0",
        rawNumber: 0,
        isCurrency: !!isCurrency,
      };
    }

    let result = 0;
    if (widget.aggregation === "SUM") {
      result = numbers.reduce((a, b) => a + b, 0);
    } else if (widget.aggregation === "AVG") {
      result = Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
    } else if (widget.aggregation === "MIN") {
      result = Math.min(...numbers);
    } else if (widget.aggregation === "MAX") {
      result = Math.max(...numbers);
    }

    return {
      formatted: isCurrency ? formatCurrency(result) : result.toLocaleString("cs-CZ"),
      rawNumber: result,
      isCurrency: !!isCurrency,
    };
  };

  const calculateWidgetValue = (widget: MetricWidget) => {
    return getWidgetData(widget).formatted;
  };
  const handleWidgetClick = (widget: MetricWidget) => {
    if (widget.filterColumnKey && widget.filterValue) {
      const key = widget.filterColumnKey;
      const currentFilter = columnFilters[key];
      if (currentFilter === widget.filterValue) {
        setColumnFilters((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        setColumnFilters((prev) => ({
          ...prev,
          [key]: widget.filterValue!,
        }));
        setPageIndex(1);
      }
    }
  };
  // Řazení a Filtrování
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnFilters, setShowColumnFilters] = useState(true);

  // Sledování změn (Dirty state) a hromadné ukládání
  const [originalRecords, setOriginalRecords] = useState<RecordItem[]>(table.records);
  const [dirtyChanges, setDirtyChanges] = useState<Record<string, Record<string, unknown>>>({});
  const [savingBatch, setSavingBatch] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Varování před opuštěním stránky při neuložených změnách
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirtyChanges).length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyChanges]);

  // Modály a rozbalovací nabídky
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Stavy pro nový sloupec
  const [newColLabel, setNewColLabel] = useState("");
  const [newColKey, setNewColKey] = useState("");
  const [isNewColKeyManual, setIsNewColKeyManual] = useState(false);
  const [newColType, setNewColType] = useState("TEXT");
  const [newColRequired, setNewColRequired] = useState(false);

  // Stavy pro Excel import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // Stavy pro OCR faktur
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    supplier: string;
    ico: string;
    dic: string;
    invoiceNumber: string;
    variableSymbol: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    currency: string;
    bankAccount: string;
  } | null>(null);

  // Zkopírování iframe kódu
  const [copied, setCopied] = useState(false);

  // Přepínání řazení
  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(null);
      setSortDirection(null);
    }
  };
  // Collator pro bleskové řazení v češtině (instanciován pouze 1x pro maximální výkon)
  const czechCollator = useMemo(
    () => new Intl.Collator("cs", { sensitivity: "base", numeric: true }),
    []
  );

  // Optimalizované jedno-průchodové filtrování a řazení záznamů
  const filteredAndSortedRecords = useMemo(() => {
    const qGlobal = globalSearch.toLowerCase().trim();
    const hasGlobal = qGlobal.length > 0;
    const hasStatus = statusFilter !== "ALL";

    // O(1) hash mapa pro sloupce
    const colMap = new Map(columns.map((c) => [c.key, c]));

    const activeColFilters = Object.entries(columnFilters)
      .filter(([_, v]) => v && v !== "ALL")
      .map(([k, v]) => ({
        key: k,
        rawVal: v,
        query: v.toLowerCase().trim(),
        col: colMap.get(k),
      }));

    const hasColFilters = activeColFilters.length > 0;

    let result = records;

    // 1-3. Jednoprůchodové filtrování bez zbytečné alokace mezilehlých polí
    if (hasGlobal || hasStatus || hasColFilters) {
      result = records.filter((r) => {
        const data = r.data || {};

        // 1. Fulltextové vyhledávání přes hodnoty
        if (hasGlobal) {
          let matches = false;
          const vals = Object.values(data);
          for (let i = 0; i < vals.length; i++) {
            const val = vals[i];
            if (val !== null && val !== undefined && String(val).toLowerCase().includes(qGlobal)) {
              matches = true;
              break;
            }
          }
          if (!matches) return false;
        }

        // 2. Filtr podle stavu
        if (hasStatus) {
          let matchesStatus = false;
          const vals = Object.values(data);
          for (let i = 0; i < vals.length; i++) {
            if (String(vals[i]) === statusFilter) {
              matchesStatus = true;
              break;
            }
          }
          if (!matchesStatus) return false;
        }

        // 3. Sloupcové filtry
        if (hasColFilters) {
          for (let i = 0; i < activeColFilters.length; i++) {
            const { key, rawVal, query, col } = activeColFilters[i];
            const val = data[key];
            if (val === undefined || val === null || val === "") return false;

            if (col?.type === "CHECKBOX") {
              if (rawVal === "TRUE" && !val) return false;
              if (rawVal === "FALSE" && !!val) return false;
              continue;
            }

            if (col?.type === "SELECT") {
              if (String(val) !== rawVal) return false;
              continue;
            }

            if (col?.type === "DATE") {
              const czech = formatCzechDate(val);
              if (
                !String(val).toLowerCase().includes(query) &&
                !czech.toLowerCase().includes(query)
              ) {
                return false;
              }
              continue;
            }

            if (!String(val).toLowerCase().includes(query)) {
              return false;
            }
          }
        }

        return true;
      });
    }

    // 4. Řazení
    if (sortKey && sortDirection) {
      const col = colMap.get(sortKey);
      const isAsc = sortDirection === "asc";
      const isNum = col?.type === "NUMBER" || col?.type === "CURRENCY";
      const isDate = col?.type === "DATE";

      result = [...result].sort((a, b) => {
        const valA = a.data?.[sortKey];
        const valB = b.data?.[sortKey];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null || valA === "") return 1;
        if (valB === undefined || valB === null || valB === "") return -1;

        if (isNum) {
          const numA = Number(valA);
          const numB = Number(valB);
          return isAsc ? numA - numB : numB - numA;
        }

        if (isDate) {
          const dateA = valA ? parseCzechDateToIso(String(valA)) : "";
          const dateB = valB ? parseCzechDateToIso(String(valB)) : "";
          return isAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        }

        const strA = String(valA);
        const strB = String(valB);
        return isAsc
          ? czechCollator.compare(strA, strB)
          : czechCollator.compare(strB, strA);
      });
    }

    return result;
  }, [records, globalSearch, statusFilter, columnFilters, sortKey, sortDirection, columns, czechCollator]);

  // Přidání nového řádku
  const handleAddRow = async () => {
    if (!userPermissions.canCreate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tables/${table.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      });
      const resData = await res.json();
      if (res.ok) {
        setRecords([resData.record, ...records]);
        setOriginalRecords([resData.record, ...originalRecords]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  // Sledování změn v buňkách (Dirty state)
  const handleCellChange = (recordId: string, columnKey: string, newValue: unknown) => {
    if (!userPermissions.canUpdate) return;
    // 1. Okamžitá plynulá aktualizace v UI
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, data: { ...r.data, [columnKey]: newValue } } : r
      )
    );

    // 2. Evidence neuložené změny
    setDirtyChanges((prev) => {
      const rowChanges = { ...(prev[recordId] || {}) };
      const orig = originalRecords.find((r) => r.id === recordId);

      if (orig && orig.data[columnKey] === newValue) {
        delete rowChanges[columnKey];
      } else {
        rowChanges[columnKey] = newValue;
      }

      if (Object.keys(rowChanges).length === 0) {
        const next = { ...prev };
        delete next[recordId];
        return next;
      }

      return { ...prev, [recordId]: rowChanges };
    });
  };
  // Hromadné uložení všech rozpracovaných změn
  const handleSaveBatch = async () => {
    const dirtyRecordIds = Object.keys(dirtyChanges);
    if (dirtyRecordIds.length === 0) return;

    setSavingBatch(true);
    try {
      const updates = dirtyRecordIds.map((id) => ({
        id,
        data: dirtyChanges[id],
      }));

      const res = await fetch(`/api/tables/${table.id}/records`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        setOriginalRecords(records);
        setDirtyChanges({});
        setSaveSuccessMsg(true);
        showToast("Změny byly úspěšně uloženy do databáze.", "success");
        setTimeout(() => setSaveSuccessMsg(false), 3000);
      } else {
        showToast("Chyba při ukládání změn do databáze.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Chyba spojení se serverem při ukládání.", "error");
    } finally {
      setSavingBatch(false);
    }
  };
  // Zahodit všechny neuložené změny
  const handleDiscardChanges = async () => {
    const isConfirmed = await confirm({
      title: "Zahodit změny?",
      message: "Opravdu chcete zahodit všechny neuložené změny v tabulce?",
      confirmText: "Zahodit změny",
      variant: "warning",
    });
    if (!isConfirmed) return;
    setRecords(originalRecords);
    setDirtyChanges({});
  };

  // Globální klávesové zkratky pro power-users (Ctrl+S, Ctrl+F, Ctrl+N, Ctrl+E, Esc, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused =
        activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      // 1. Uložení rozpracovaných změn přes Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (Object.keys(dirtyChanges).length > 0) {
          handleSaveBatch();
        }
        return;
      }

      // 2. Rychlé vyhledávání přes Ctrl+F / Cmd+F nebo "/" pokud nejsme v inputu
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (!isInputFocused && e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 3. Nový řádek přes Ctrl+N / Cmd+N
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleAddRow();
        return;
      }

      // 4. Rychlý export do Excelu přes Ctrl+E / Cmd+E
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleExportExcel();
        return;
      }

      // 5. Klávesa Escape pro zrušení výběru, vyčištění hledání nebo zavření oken
      if (e.key === "Escape") {
        if (globalSearch) {
          setGlobalSearch("");
        } else if (selectedRecordIds.length > 0) {
          setSelectedRecordIds([]);
        }
        setShowImportDropdown(false);
        setShowExportDropdown(false);
        setShowShortcutsModal(false);
      }

      // 6. Nápověda klávesových zkratek a Centrum nápovědy přes "?" nebo "F1" (mimo input)
      if (!isInputFocused && (e.key === "?" || e.key === "F1")) {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirtyChanges, globalSearch, selectedRecordIds]);
  // Smazání řádku
  const handleDeleteRow = async (recordId: string) => {
    const isConfirmed = await confirm({
      title: "Smazat záznam?",
      message: "Opravdu si přejete smazat tento řádek? Tato akce je nevratná.",
      confirmText: "Smazat",
      variant: "danger",
    });
    if (!isConfirmed) return;
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    if (selectedRecordId === recordId) setSelectedRecordId(null);
    try {
      await fetch(`/api/records/${recordId}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
  };
  // Duplikace záznamu
  const handleDuplicateRow = async (recordId: string) => {
    const src = records.find((r) => r.id === recordId);
    if (!src) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tables/${table.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { ...src.data } }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecords([data.record, ...records]);
        setOriginalRecords([data.record, ...originalRecords]);
        setSelectedRecordId(data.record.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  // Přepínání výběru jednotlivého řádku
  const handleToggleSelectRecord = (recordId: string) => {
    setSelectedRecordIds((prev) => {
      const exists = prev.includes(recordId);
      const next = exists ? prev.filter((id) => id !== recordId) : [...prev, recordId];
      setSelectedRecordId(next.length === 1 ? next[0] : next.length > 1 ? next[next.length - 1] : null);
      return next;
    });
  };
  // Přepínání výběru všech řádků na aktuální stránce
  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedRecords.map((r) => r.id);
    const allSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedRecordIds.includes(id));

    if (allSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      setSelectedRecordId(null);
    } else {
      const combined = Array.from(new Set([...selectedRecordIds, ...currentPageIds]));
      setSelectedRecordIds(combined);
      setSelectedRecordId(combined[0] || null);
    }
  };
  // Kliknutí na řádek (výběr / multiselect se Shift/Ctrl)
  const handleRowClick = (record: RecordItem, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "A" ||
      target.tagName === "BUTTON"
    ) {
      return;
    }

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      handleToggleSelectRecord(record.id);
    } else {
      setSelectedRecordIds([record.id]);
      setSelectedRecordId(record.id);
    }
  };
  // Dvojklik na řádek pro otevření detailního formuláře
  const handleRowDoubleClick = (record: RecordItem) => {
    setSelectedRecordForDetail(record);
    setIsDetailModalOpen(true);
  };
  // Hromadné smazání vybraných řádků
  const handleDeleteSelected = async () => {
    if (!userPermissions.canDelete) return;
    const count = selectedRecordIds.length;
    if (count === 0) return;
    const isConfirmed = await confirm({
      title: `Smazat ${count} vybraných záznamů?`,
      message: `Opravdu chcete smazat ${count} vybraných záznamů? Tato akce je nevratná.`,
      confirmText: `Smazat ${count} záznamů`,
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/tables/${table.id}/records`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordIds: selectedRecordIds }),
      });

      if (res.ok) {
        setRecords((prev) => prev.filter((r) => !selectedRecordIds.includes(r.id)));
        setOriginalRecords((prev) => prev.filter((r) => !selectedRecordIds.includes(r.id)));
        setSelectedRecordIds([]);
        setSelectedRecordId(null);
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
    } finally {
      setLoading(false);
    }
  };
  // Hromadná duplikace vybraných řádků
  const handleDuplicateSelected = async () => {
    if (selectedRecordIds.length === 0) return;
    try {
      setLoading(true);
      const toDuplicate = records.filter((r) => selectedRecordIds.includes(r.id));
      for (const rec of toDuplicate) {
        const res = await fetch(`/api/tables/${table.id}/records`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { ...rec.data } }),
        });
        const resJson = await res.json();
        if (res.ok && resJson.record) {
          setRecords((prev) => [resJson.record, ...prev]);
          setOriginalRecords((prev) => [resJson.record, ...prev]);
        }
      }
      setSelectedRecordIds([]);
      setSelectedRecordId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  // Hromadná úprava hodnoty vybraného sloupce
  const handleBulkEditApply = async (columnKey: string, value: unknown) => {
    if (selectedRecordIds.length === 0) return;
    const updates = selectedRecordIds.map((id) => ({
      id,
      data: { [columnKey]: value },
    }));

    const res = await fetch(`/api/tables/${table.id}/records`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });

    if (res.ok) {
      setRecords((prev) =>
        prev.map((r) =>
          selectedRecordIds.includes(r.id)
            ? { ...r, data: { ...r.data, [columnKey]: value } }
            : r
        )
      );
      setOriginalRecords((prev) =>
        prev.map((r) =>
          selectedRecordIds.includes(r.id)
            ? { ...r, data: { ...r.data, [columnKey]: value } }
            : r
        )
      );
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } else {
      throw new Error("Chyba při hromadném ukládání");
    }
  };
  // Uložení změn z detailního modálního okna záznamu
  const handleSaveRecordFromModal = async (
    recordId: string,
    updatedData: Record<string, unknown>
  ) => {
    const res = await fetch(`/api/records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });
    if (res.ok) {
      const resJson = await res.json();
      const updated = resJson.record;
      setRecords((prev) => prev.map((r) => (r.id === recordId ? updated : r)));
      setOriginalRecords((prev) => prev.map((r) => (r.id === recordId ? updated : r)));
      setDirtyChanges((prev) => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } else {
      throw new Error("Chyba při ukládání záznamu.");
    }
  };
  // Přidání nového sloupce
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tables/${table.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newColLabel,
          key: newColKey.trim() || undefined,
          type: newColType,
          isRequired: newColRequired,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setColumns([...columns, data.column]);
        setShowAddColumnModal(false);
        setNewColLabel("");
        setNewColKey("");
        setIsNewColKeyManual(false);
      }
    } catch (e) {
      console.error(e);
    }
  };
  // Bezpečná úprava hodnoty pro Excel (limit buňky v Excelu je 32 767 znaků)
  const sanitizeForExport = (val: unknown): unknown => {
    if (val === null || val === undefined) return "";
    if (typeof val === "boolean" || typeof val === "number") return val;
    if (typeof val === "string") {
      // Base64 obrázek nebo dlouhý data URL
      if (val.startsWith("data:") && val.length > 500) {
        return "[Obrázek / Příloha]";
      }
      if (val.length > 32000) {
        return val.slice(0, 32000) + "... [zkráceno]";
      }
      return val;
    }
    if (typeof val === "object") {
      const str = JSON.stringify(val);
      if (str.length > 32000) {
        return str.slice(0, 32000) + "... [zkráceno]";
      }
      return str;
    }
    return String(val);
  };
  // Export do Excelu (.xlsx)
  const handleExportExcel = () => {
    try {
      const targetRecords =
        selectedRecordIds.length > 0
          ? records.filter((r) => selectedRecordIds.includes(r.id))
          : filteredAndSortedRecords;

      const exportData = targetRecords.map((r) => {
        const row: Record<string, unknown> = {};
        visibleColumns.forEach((col) => {
          const rawVal = r.data[col.key];
          if (col.type === "DATE") {
            row[col.label] = formatCzechDate(rawVal) || "";
          } else if (col.type === "CHECKBOX") {
            row[col.label] = rawVal ? "Ano" : "Ne";
          } else {
            row[col.label] = sanitizeForExport(rawVal);
          }
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      const safeSheetName = (table.name || "List 1").replace(/[\\/?*[\]:]/g, "_").slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
      XLSX.writeFile(workbook, `${table.name || "export"}_export.xlsx`);
      showToast(`Úspěšně exportováno ${targetRecords.length} záznamů do Excelu (.xlsx)!`, "success");
    } catch (err: any) {
      console.error("Excel export error:", err);
      showToast(err?.message || "Chyba při exportu do Excelu.", "error");
    }
  };
  // Export do CSV s UTF-8 BOM pro českou diakritiku v Excelu
  const handleExportCsv = () => {
    try {
      const targetRecords =
        selectedRecordIds.length > 0
          ? records.filter((r) => selectedRecordIds.includes(r.id))
          : filteredAndSortedRecords;

      const exportData = targetRecords.map((r) => {
        const row: Record<string, unknown> = {};
        visibleColumns.forEach((col) => {
          const rawVal = r.data[col.key];
          if (col.type === "DATE") {
            row[col.label] = formatCzechDate(rawVal) || "";
          } else if (col.type === "CHECKBOX") {
            row[col.label] = rawVal ? "Ano" : "Ne";
          } else {
            row[col.label] = sanitizeForExport(rawVal);
          }
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob(["\uFEFF" + csvOutput], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${table.name || "export"}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Úspěšně exportováno ${targetRecords.length} záznamů do CSV!`, "success");
    } catch (err: any) {
      console.error("CSV export error:", err);
      showToast(err?.message || "Chyba při exportu do CSV.", "error");
    }
  };
  // Import z Excelu
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportMsg(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch(`/api/tables/${table.id}/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(data.message);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setImportMsg(data.error || "Chyba při importu");
      }
    } catch (err: unknown) {
      setImportMsg(err instanceof Error ? err.message : "Chyba");
    } finally {
      setImporting(false);
    }
  };
  // OCR Vytěžení faktury
  const handleOcrUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrFile) return;

    setOcrLoading(true);
    const formData = new FormData();
    formData.append("file", ocrFile);

    try {
      const res = await fetch("/api/ocr/invoice", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setOcrResult(data.invoice);
        showToast("Faktura byla úspěšně vytěžena přes AI OCR!", "success");
      } else {
        showToast(data.error || "Chyba při OCR vytěžování", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Chyba při nahrávání faktury", "error");
    } finally {
      setOcrLoading(false);
    }
  };
  // Uložení vytěžené faktury do tabulky
  const handleSaveOcrRecord = async () => {
    if (!ocrResult) return;

    // Namapování vytěžených dat na existující sloupce tabulky
    const rowData: Record<string, unknown> = {};

    for (const col of columns) {
      const labelLower = col.label.toLowerCase();
      const keyLower = col.key.toLowerCase();

      if (labelLower.includes("dodavatel") || keyLower.includes("supplier") || col.isPrimary) {
        rowData[col.key] = ocrResult.supplier || ocrResult.invoiceNumber;
      } else if (labelLower.includes("číslo") || labelLower.includes("doklad") || keyLower.includes("inv")) {
        rowData[col.key] = ocrResult.invoiceNumber;
      } else if (labelLower.includes("ičo") || labelLower.includes("ič") || keyLower.includes("ico")) {
        rowData[col.key] = ocrResult.ico;
      } else if (labelLower.includes("částka") || labelLower.includes("cena") || col.type === "CURRENCY") {
        rowData[col.key] = ocrResult.totalAmount;
      } else if (labelLower.includes("splatnost") || keyLower.includes("due")) {
        rowData[col.key] = ocrResult.dueDate;
      } else if (labelLower.includes("vystavení") || keyLower.includes("issue")) {
        rowData[col.key] = ocrResult.issueDate;
      } else if (labelLower.includes("variabilní") || keyLower.includes("vs")) {
        rowData[col.key] = ocrResult.variableSymbol;
      } else if (labelLower.includes("účet") || labelLower.includes("iban") || keyLower.includes("account")) {
        rowData[col.key] = ocrResult.bankAccount;
      } else if (col.type === "SELECT") {
        rowData[col.key] = "K úhradě";
      }
    }

    try {
      const res = await fetch(`/api/tables/${table.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rowData }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecords([data.record, ...records]);
        setShowOcrModal(false);
        setOcrResult(null);
        setOcrFile(null);
      }
    } catch (e) {
      console.error(e);
    }
  };
  // Výpočet patičkových součtů nad vyfiltrovanou množinou
  const calculateFooter = (col: Column) => {
    if (col.type !== "NUMBER" && col.type !== "CURRENCY") {
      return null;
    }
    const numbers = filteredAndSortedRecords
      .map((r) => Number(r.data[col.key]))
      .filter((n) => !isNaN(n) && n !== 0);

    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    const avg = numbers.length > 0 ? sum / numbers.length : 0;

    return {
      sum: col.type === "CURRENCY" ? formatCurrency(sum) : sum.toLocaleString("cs-CZ"),
      avg: col.type === "CURRENCY" ? formatCurrency(avg) : Math.round(avg).toLocaleString("cs-CZ"),
    };  };
  // Možnosti filtrů pro výběrové pole
  const selectColumn = columns.find((c) => c.type === "SELECT");
  const selectOptions = Array.isArray(selectColumn?.config?.options)
    ? (selectColumn?.config?.options as { id: string; label: string }[])
    : [];

  const iframeSnippet = shareToken
    ? `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/share/form/${shareToken}" width="100%" height="650" frameborder="0" style="border:none;border-radius:8px;"></iframe>`
    : "";



  // Počet aktivních filtrů
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (globalSearch.trim()) count++;
    if (statusFilter !== "ALL") count++;
    count += Object.values(columnFilters).filter((v) => v && v !== "ALL").length;
    return count;
  }, [globalSearch, statusFilter, columnFilters]);

  // Stránkování (Pagination)
  const totalRows = filteredAndSortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const paginatedRecords = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, pageIndex, pageSize]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
      {/* 1. TOP KPI STATUS SUMMARY CARDS / DYNAMICKÉ WIDGETY */}
      {widgets.length > 0 && !isWidgetsCollapsed && (
        <div className="px-6 pt-4 pb-2 flex items-center gap-4 shrink-0 flex-wrap overflow-x-auto transition-all animate-in fade-in">
          {widgets.map((w, idx) => {
            const isFilterActive =
              w.filterColumnKey &&
              w.filterValue &&
              columnFilters[w.filterColumnKey] === w.filterValue;

            const isOutline = w.styleVariant === "OUTLINE";
            const widgetData = getWidgetData(w);
            const hasGoal = Boolean(w.targetGoal && w.targetGoal > 0 && w.type === "METRIC");
            const progressPercent = hasGoal
              ? Math.min(100, Math.max(0, Math.round(((widgetData.rawNumber ?? 0) / w.targetGoal!) * 100)))
              : 0;

            // Výpočet šířky podle nastavení widgetu (konkurence Airtable / Notion)
            const widthClass =
              w.width === "WIDE"
                ? "w-96 min-w-[320px] max-w-full"
                : w.width === "FULL"
                  ? "flex-1 min-w-[320px]"
                  : "w-56";

            const heightClass = hasGoal ? "h-[104px]" : "h-[92px]";

            return (
              <div
                key={w.id}
                onClick={() => w.type === "METRIC" && handleWidgetClick(w)}
                title={
                  w.filterColumnKey && w.filterValue
                    ? `Kliknutím filtrujete ${w.filterColumnKey} = "${w.filterValue}" (opětovným kliknutím filtr zrušíte)`
                    : undefined
                }
                className={`group relative ${widthClass} ${heightClass} rounded-xl p-3 flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01] select-none ${
                  w.type === "METRIC" ? "cursor-pointer" : ""
                } ${
                  isOutline
                    ? "bg-white border-2 border-slate-200/90 text-slate-800 hover:border-slate-300"
                    : "text-white shadow-xs"
                } ${isFilterActive ? "ring-2 ring-offset-2 ring-slate-800 scale-[1.02]" : ""}`}
                style={{
                  backgroundColor: isOutline ? "#ffffff" : w.color,
                  borderLeft: isOutline ? `5px solid ${w.color}` : undefined,
                }}
              >
                {/* Horní řádek widgetu: titulek + ikona agregace / typu + akce pro úpravu & přesun */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11px] font-bold tracking-wider uppercase truncate ${
                        isOutline ? "text-slate-600" : "opacity-90"
                      }`}
                    >
                      {w.title}
                    </span>
                    {w.trendText && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                          isOutline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-white/25 text-white"
                        }`}
                      >
                        {w.trendText}
                      </span>
                    )}
                    <span
                      className={`font-mono text-[10px] px-1 py-0.5 rounded shrink-0 ${
                        isOutline
                          ? "bg-slate-100 text-slate-600"
                          : "opacity-75 bg-black/15 text-white"
                      }`}
                    >
                      {w.type === "HTML_SNIPPET"
                        ? "</>"
                        : w.type === "QUICK_ACTION"
                          ? "⚡"
                          : w.aggregation === "COUNT"
                            ? "#"
                            : w.aggregation === "SUM"
                              ? "Σ"
                              : w.aggregation === "AVG"
                                ? "x̄"
                                : w.aggregation === "MIN"
                                  ? "min"
                                  : "max"}
                    </span>
                  </div>

                  {/* Tlačítka posunu v gridu, úpravy a smazání widgetu (zobrazí se při najetí myší) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveWidget(idx, "left");
                        }}
                        title="Posunout doleva"
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isOutline
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-black/20 hover:bg-black/40 text-white"
                        }`}
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    )}
                    {idx < widgets.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveWidget(idx, "right");
                        }}
                        title="Posunout doprava"
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isOutline
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-black/20 hover:bg-black/40 text-white"
                        }`}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWidget(w);
                        setIsWidgetModalOpen(true);
                      }}
                      title="Upravit widget"
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isOutline
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-black/20 hover:bg-black/40 text-white"
                      }`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const isConfirmed = await confirm(`Opravdu smazat widget "${w.title}"?`);
                        if (isConfirmed) {
                          handleDeleteWidget(w.id);
                        }
                      }}
                      title="Smazat widget"
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isOutline
                          ? "bg-red-50 hover:bg-red-100 text-red-600"
                          : "bg-black/20 hover:bg-red-600/80 text-white"
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Obsah karty podle typu widgetu */}
                {w.type === "HTML_SNIPPET" ? (
                  <div
                    className={`flex-1 overflow-y-auto text-[11px] py-0.5 leading-tight scrollbar-thin ${
                      isOutline ? "text-slate-700" : "text-white/95"
                    }`}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: w.htmlContent || "<span class='italic opacity-70'>Text / HTML kód</span>",
                      }}
                    />
                  </div>
                ) : w.type === "QUICK_ACTION" ? (
                  <div className="flex-1 flex items-center justify-center py-1">
                    <a
                      href={w.actionUrl || "#"}
                      target={w.actionUrl?.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!w.actionUrl || !w.actionUrl.startsWith("http")) {
                          e.preventDefault();
                          showToast(`Rychlá akce "${w.title}" byla aktivována!`, "success");
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 ${
                        isOutline
                          ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-white/20 hover:bg-white/30 text-white"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{w.actionLabel || "Spustit akci"}</span>
                      {w.actionUrl?.startsWith("http") && <ExternalLink className="w-3 h-3 opacity-70" />}
                    </a>
                  </div>
                ) : (
                  /* Standardní metrika s agregací a případným progress barem */
                  <div>
                    <div
                      className={`text-2xl font-light tracking-tight text-center truncate ${
                        isOutline ? "text-slate-900 font-semibold" : "text-white"
                      }`}
                    >
                      {widgetData.formatted}
                    </div>
                    {hasGoal && (
                      <div className="space-y-0.5 mt-1">
                        <div
                          className={`w-full h-1.5 rounded-full overflow-hidden ${
                            isOutline ? "bg-slate-200" : "bg-black/20"
                          }`}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progressPercent}%`,
                              backgroundColor: isOutline ? w.color : "#ffffff",
                            }}
                          />
                        </div>
                        <div
                          className={`flex justify-between items-center text-[9px] ${
                            isOutline ? "text-slate-500" : "opacity-80 text-white"
                          }`}
                        >
                          <span>Cíl: {w.targetGoal?.toLocaleString("cs-CZ")}</span>
                          <span className="font-bold">{progressPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Spodní řádek: informace o filtru nebo podtitulek */}
                {w.filterColumnKey && w.filterValue ? (
                  <div
                    className={`text-[10px] truncate flex items-center justify-between ${
                      isOutline ? "text-slate-500" : "opacity-80 text-white"
                    }`}
                  >
                    <span className="truncate">
                      {w.filterColumnKey}: {w.filterValue}
                    </span>
                    {isFilterActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWidgetClick(w);
                        }}
                        className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          isOutline
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "bg-white/30 text-white hover:bg-white/50"
                        }`}
                        title="Kliknutím zrušíte filtr"
                      >
                        ✕ Zrušit filtr
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={`text-[10px] truncate ${
                      isOutline ? "text-slate-400" : "opacity-60 text-white"
                    }`}
                  >
                    {w.type === "HTML_SNIPPET"
                      ? "Informační banner"
                      : w.type === "QUICK_ACTION"
                        ? w.actionUrl ? "Externí odkaz / akce" : "Lokální akce"
                        : w.aggregation === "COUNT"
                          ? "Všechny řádky"
                          : w.targetColumnKey || ""}
                  </div>
                )}
              </div>
            );
          })}

          {/* Tlačítko "+ Přidat widget" (tečkovaný box) */}
          <button
            type="button"
            onClick={() => {
              setEditingWidget(null);
              setIsWidgetModalOpen(true);
            }}
            className="h-[92px] min-w-[120px] px-3.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1e60f0] bg-white/60 hover:bg-white text-slate-500 hover:text-[#1e60f0] flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs group cursor-pointer"
            title="Přidat nový widget (metrika, HTML, akce)"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#1e60f0]" />
            </div>
            <span className="text-[11px] font-semibold">Přidat widget</span>
          </button>

          {/* Tlačítko sbalení widgetů do úzké lišty */}
          <button
            type="button"
            onClick={() => setIsWidgetsCollapsed(true)}
            title="Sbalit lištu widgetů pro maximální výšku tabulky"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer self-center"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. ACTION TOOLBAR */}
      <div className="px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Levá skupina tlačítek akcí */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tlačítko Přidat řádek (modrý čtverec) */}
          {userPermissions.canCreate && (
            <button
              onClick={handleAddRow}
              disabled={loading}
              title="Přidat nový řádek"
              className="w-8 h-8 rounded-lg bg-[#1e60f0] hover:bg-blue-700 text-white flex items-center justify-center font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          {/* Upravit vybraný řádek (nebo hromadná úprava při výběru více řádků) */}
          <button
            type="button"
            disabled={selectedRecordIds.length === 0}
            onClick={() => {
              if (selectedRecordIds.length === 1) {
                const rec = records.find((r) => r.id === selectedRecordIds[0]);
                if (rec) {
                  setSelectedRecordForDetail(rec);
                  setIsDetailModalOpen(true);
                }
              } else if (selectedRecordIds.length > 1 && userPermissions.canUpdate) {
                setIsBulkEditModalOpen(true);
              }
            }}
            title={
              selectedRecordIds.length === 0
                ? "Vyberte řádek pro úpravu"
                : selectedRecordIds.length === 1
                  ? "Zobrazit a upravit detail záznamu ve formuláři"
                  : `Hromadná úprava (${selectedRecordIds.length} vybraných řádků)`
            }
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${selectedRecordIds.length > 0
              ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              : "bg-white text-slate-300 border-slate-200 opacity-50 cursor-not-allowed"
              }`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Hromadná změna hodnot (Bulk Edit) */}
          {userPermissions.canUpdate && (
            <button
              type="button"
              disabled={selectedRecordIds.length === 0}
              onClick={() => setIsBulkEditModalOpen(true)}
              title={
                selectedRecordIds.length > 0
                  ? `Hromadná změna hodnot u ${selectedRecordIds.length} vybraných řádků`
                  : "Vyberte řádky pro hromadnou změnu hodnot"
              }
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${selectedRecordIds.length > 0
                ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 font-bold"
                : "bg-white text-slate-300 border-slate-200 opacity-50 cursor-not-allowed"
                }`}
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Duplikovat záznam (záznamy) */}
          {userPermissions.canCreate && (
            <button
              onClick={handleDuplicateSelected}
              disabled={selectedRecordIds.length === 0 || loading}
              title={
                selectedRecordIds.length > 0
                  ? `Duplikovat ${selectedRecordIds.length} vybraných záznamů`
                  : "Vyberte řádek pro duplikaci"
              }
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Smazat vybrané záznamy */}
          {userPermissions.canDelete && (
            <button
              onClick={handleDeleteSelected}
              disabled={selectedRecordIds.length === 0 || loading}
              title={
                selectedRecordIds.length > 0
                  ? `Smazat ${selectedRecordIds.length} vybraných záznamů`
                  : "Vyberte řádek ke smazání"
              }
              className="w-8 h-8 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Obnovit / Refresh & Zrušit výběr */}
          <button
            onClick={() => {
              setPageIndex(1);
              setSelectedRecordIds([]);
              setSelectedRecordId(null);
            }}
            title="Obnovit tabulku a zrušit výběr"
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Tisková šablona faktury vybraného řádku */}
          {selectedRecordIds.length > 0 && (
            <Link
              href={`/${workspaceSlug}/${appId}/${table.id}/record/${selectedRecordIds[0]}`}
              title="Tisk faktury / Karta A4 s QR platbou"
              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1e60f0] border border-blue-200 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Nastavení struktury sloupců */}
          {userPermissions.canManageSchema && (
            <Link
              href={`/${workspaceSlug}/${appId}/${table.id}/settings`}
              title="Správa sloupců (Schema Builder)"
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* VLASTNÍ TLAČÍTKA WORKFLOW NAD TABULKOU */}
          {userPermissions.canUpdate &&
            automations
              .filter((a) => a.isActive && a.triggerType === "MANUAL_BUTTON")
              .map((auto) => {
                const cfg = (auto.triggerConfig || {}) as Record<string, any>;
                const btnColor = cfg.buttonColor || "#059669";
                const btnLabel = cfg.buttonLabel || auto.name;
                const isNoSelection = selectedRecordIds.length === 0;

                return (
                  <button
                    key={auto.id}
                    type="button"
                    onClick={() => handleExecuteManualAutomation(auto)}
                    disabled={loading || executingAutomationId === auto.id || isNoSelection}
                    title={
                      isNoSelection
                        ? `Pro spuštění "${auto.name}" nejprve zaškrtněte v tabulce alespoň jeden řádek`
                        : `Spustit workflow "${auto.name}" pro ${selectedRecordIds.length} vybraných záznamů`
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                      isNoSelection
                        ? "opacity-40 cursor-not-allowed grayscale-[40%]"
                        : "hover:brightness-110 cursor-pointer"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    style={{ backgroundColor: btnColor }}
                  >
                    {executingAutomationId === auto.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>{btnLabel}</span>
                    {selectedRecordIds.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-mono">
                        {selectedRecordIds.length}
                      </span>
                    )}
                  </button>
                );
              })}

          {/* Tlačítko JavaScript Skriptování */}
          {userPermissions.canManageSchema && (
            <button
              type="button"
              onClick={() => setIsScriptModalOpen(true)}
              title="Vlastní JavaScript skriptování pro tabulku"
              className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* PŘEPÍNAČ ULOŽENÝCH POHLEDŮ (VIEWS SWITCHER) */}
          <div className="relative z-40">
            <button
              type="button"
              onClick={() => {
                setShowViewsDropdown(!showViewsDropdown);
                setShowExportDropdown(false);
                setShowImportDropdown(false);
                setShowColumnVisibilityDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-sm transition-colors cursor-pointer"
              title="Přepnout nebo uložit nastavení zobrazení tabulky"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#1e60f0]" />
              <span className="max-w-[130px] truncate">{activeViewObj?.name || "Výchozí zobrazení"}</span>
              {activeViewObj?.isDefault && (
                <span className="text-[11px] text-amber-500 font-bold" title="Výchozí pohled">★</span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showViewsDropdown && (
              <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Pohledy tabulky</span>
                  <span className="text-slate-400">{tableViews.length}</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5 px-1">
                  {tableViews.map((v) => {
                    const isActive = v.id === activeViewId;
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          applyView(v);
                          setShowViewsDropdown(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isActive
                            ? "bg-blue-50 text-[#1e60f0] font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-[#1e60f0] shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{v.name}</span>
                          {v.isDefault && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-bold shrink-0">
                              Výchozí
                            </span>
                          )}
                        </div>

                        {v.id !== "default-grid-view" && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteView(v.id, e)}
                            title="Smazat pohled"
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors ml-1 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 my-1" />

                <div className="px-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleQuickSaveCurrentView}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-500" />
                    <span>Uložit změny v pohledu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSaveViewName("");
                      setSaveViewIsDefault(false);
                      setShowSaveViewModal(true);
                      setShowViewsDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#1e60f0] hover:bg-blue-50 rounded-lg font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#1e60f0]" />
                    <span>Uložit jako nový pohled...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Indikátory oprávnění */}
          {userPermissions.level === "READ_ONLY" && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Pouze pro čtení</span>
            </span>
          )}
          {userPermissions.onlyOwnRecords && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Pouze vaše záznamy</span>
            </span>
          )}

          {/* Indikátor počtu vybraných řádků */}
          {selectedRecordIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 ml-1 animate-in fade-in">
              <span>
                Vybráno: <strong>{selectedRecordIds.length}</strong>{" "}
                {selectedRecordIds.length === 1
                  ? "řádek"
                  : selectedRecordIds.length < 5
                    ? "řádky"
                    : "řádků"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecordIds([]);
                  setSelectedRecordId(null);
                }}
                className="text-blue-500 hover:text-blue-800 text-[11px] underline cursor-pointer ml-1"
              >
                Zrušit
              </button>
            </div>
          )}
        </div>

        {/* Pravá skupina tlačítek akcí */}
        <div className="flex items-center gap-2">
          {/* Tlačítko filtru s počítadlem aktivních filtrů */}
          <button
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${showColumnFilters || activeFilterCount > 0
              ? "bg-[#1e60f0]/10 text-[#1e60f0] border-[#1e60f0]/30"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            title="Zobrazit / skrýt filtry sloupců"
          >
            <Filter className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#1e60f0] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Vyhledávací pole Hledat... */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setPageIndex(1);
              }}
              placeholder="Hledat... (Ctrl+F)"
              className="w-44 sm:w-56 pl-8 pr-10 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e60f0] focus:border-[#1e60f0] placeholder:text-slate-400 shadow-sm"
            />
            {!globalSearch ? (
              <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono text-slate-400 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                ⌘F
              </kbd>
            ) : (
              <button
                onClick={() => {
                  setGlobalSearch("");
                  setPageIndex(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Klikací pozadí pro zavření dropdownů */}
          {(showImportDropdown || showExportDropdown) && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => {
                setShowImportDropdown(false);
                setShowExportDropdown(false);
              }}
            />
          )}

          {/* IKONKOVÉ TLAČÍTKO: IMPORT (s rozbalovací nabídkou dle požadavku) */}
          <div className="relative z-40">
            <button
              onClick={() => {
                setShowImportDropdown(!showImportDropdown);
                setShowExportDropdown(false);
              }}
              title="Importovat data (Excel, CSV, OCR Faktura)"
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${showImportDropdown
                ? "bg-blue-50 text-[#1e60f0] border-blue-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {showImportDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Možnosti importu
                </div>
                <button
                  onClick={() => {
                    setShowImportDropdown(false);
                    setShowImportModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">Import z Excelu (.xlsx)</div>
                    <div className="text-[10px] text-slate-400">Načíst data ze souboru Excel</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowImportDropdown(false);
                    setShowImportModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">Import z CSV</div>
                    <div className="text-[10px] text-slate-400">Textový soubor oddělený čárkou</div>
                  </div>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowImportDropdown(false);
                    setShowOcrModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/70 flex items-center gap-3 text-slate-700 transition-colors"
                >
                  <ScanText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <span>Import faktury (OCR)</span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-semibold">
                        AI
                      </span>
                    </div>
                    <div className="text-[10px] text-indigo-500">Vytěžit z PDF nebo obrázku faktury</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* IKONKOVÉ TLAČÍTKO: EXPORT (s rozbalovací nabídkou dle požadavku) */}
          <div className="relative z-40">
            <button
              onClick={() => {
                setShowExportDropdown(!showExportDropdown);
                setShowImportDropdown(false);
              }}
              title="Exportovat data (Excel, CSV)"
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${showExportDropdown
                ? "bg-blue-50 text-[#1e60f0] border-blue-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {showExportDropdown && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Možnosti exportu</span>
                    {selectedRecordIds.length > 0 && (
                      <span className="text-blue-600 font-bold text-[9px] bg-blue-50 px-1.5 py-0.5 rounded">
                        {selectedRecordIds.length} vybráno
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      handleExportExcel();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">
                        Export do Excelu (.xlsx)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {selectedRecordIds.length > 0
                          ? `Exportuje ${selectedRecordIds.length} vybraných řádků`
                          : `Všech ${filteredAndSortedRecords.length} záznamů v tabulce`}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      handleExportCsv();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Export do CSV</div>
                      <div className="text-[10px] text-slate-400">
                        {selectedRecordIds.length > 0
                          ? `Exportuje ${selectedRecordIds.length} vybraných řádků`
                          : `UTF-8 formát s českou diakritikou`}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Zveřejnit webový formulář (Iframe & Veřejný odkaz) */}
            {userPermissions.canManageSchema && (
              <button
                type="button"
                onClick={() => setShowIframeModal(true)}
                title={
                  isFormPublic
                    ? "Veřejný webový formulář je aktivní – zobrazit odkaz a Iframe"
                    : "Zveřejnit webový formulář (Iframe & Veřejný odkaz)"
                }
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer relative ${
                  isFormPublic
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                {isFormPublic && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </button>
            )}

            {/* Podmíněné formátování */}
            <button
              type="button"
              onClick={() => setShowFormattingModal(true)}
              title={
                formattingRules.length > 0
                  ? `Podmíněné formátování (${formattingRules.length} aktivních pravidel)`
                  : "Podmíněné formátování"
              }
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer relative ${
                formattingRules.length > 0
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              {formattingRules.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {formattingRules.length}
                </span>
              )}
            </button>

            {/* Rychlé zobrazení / skrytí sloupců v tabulce */}
            <div className="relative z-40">
              <button
                type="button"
                onClick={() => {
                  setShowColumnVisibilityDropdown(!showColumnVisibilityDropdown);
                  setShowExportDropdown(false);
                  setShowImportDropdown(false);
                }}
                title={`Zobrazit / skrýt sloupce v tabulce (${visibleColumns.length}/${columns.length})`}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                  hiddenColumnKeys.length > 0
                    ? "bg-blue-50 text-[#1e60f0] border-blue-300"
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {showColumnVisibilityDropdown && (
                <div className="absolute right-0 mt-1 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-xs animate-in fade-in space-y-1.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1 text-[11px] font-bold text-slate-500 uppercase">
                    <span>Sloupce ({visibleColumns.length}/{columns.length})</span>
                    <button
                      type="button"
                      onClick={() => setHiddenColumnKeys([])}
                      className="text-blue-600 hover:underline text-[10px] font-semibold cursor-pointer"
                    >
                      Zobrazit vše
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                    {columns.map((c) => {
                      const isHidden = hiddenColumnKeys.includes(c.key);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors select-none"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setHiddenColumnKeys(hiddenColumnKeys.filter((k) => k !== c.key));
                                } else {
                                  setHiddenColumnKeys([...hiddenColumnKeys, c.key]);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-[#1e60f0] cursor-pointer"
                            />
                            <span className="truncate">{c.label}</span>
                          </div>
                          {isHidden ? (
                            <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
                          ) : (
                            <Eye className="w-3 h-3 text-blue-600 shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {userPermissions.canManageSchema && (
                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowColumnVisibilityDropdown(false);
                          setNewColLabel("");
                          setNewColKey("");
                          setIsNewColKeyManual(false);
                          setShowAddColumnModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Přidat nový sloupec
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Centrum nápovědy & Klávesové zkratky */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              title="Centrum nápovědy a klávesové zkratky (?)"
              className="w-8 h-8 rounded-lg border bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            </button>

            {/* Widgety přepínač / přidat */}
            {widgets.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsWidgetsCollapsed(!isWidgetsCollapsed)}
                title={isWidgetsCollapsed ? `Rozbalit widgety (${widgets.length})` : "Sbalit widgety pro maximální výšku tabulky"}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                  !isWidgetsCollapsed
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Widgety</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">
                  {widgets.length}
                </span>
                {isWidgetsCollapsed ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronUp className="w-3 h-3 text-blue-600" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingWidget(null);
                  setIsWidgetModalOpen(true);
                }}
                title="Přidat nový widget (metrika, HTML banner, rychlá akce)"
                className="h-8 px-2.5 rounded-lg border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Přidat widget</span>
              </button>
            )}

            {/* Veřejné REST API & AI napojení pro tabulku */}
            <button
              type="button"
              onClick={() => setShowApiModal(true)}
              title="Veřejné REST API a tokeny pro ChatGPT, Claude a externí integrace"
              className="h-8 px-2.5 rounded-lg border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer text-xs font-semibold"
            >
              <Code className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">API</span>
            </button>

          {/* Přepínače zobrazení (Grid, Calendar, Kanban, List, Maximize) */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView("GRID")}
              title="Tabulkové zobrazení"
              className={`p-1.5 transition-colors cursor-pointer ${activeView === "GRID"
                ? "bg-[#eaf2ff] text-[#1e60f0] font-bold"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView("CALENDAR")}
              title="Kalendářní zobrazení"
              className={`p-1.5 transition-colors cursor-pointer ${activeView === "CALENDAR"
                ? "bg-[#eaf2ff] text-[#1e60f0] font-bold"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView("KANBAN")}
              title="Kanban zobrazení"
              className={`p-1.5 transition-colors cursor-pointer ${activeView === "KANBAN"
                ? "bg-[#eaf2ff] text-[#1e60f0] font-bold"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView("GRID")}
              title="Mřížkové zobrazení"
              className={`p-1.5 transition-colors cursor-pointer ${activeView === "GRID"
                ? "bg-[#eaf2ff] text-[#1e60f0] font-bold"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen?.();
                } else {
                  document.exitFullscreen?.();
                }
              }}
              title="Celá obrazovka"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

        {/* 3. HLAVNÍ OBSAH POHLEDU (TABULKA / KANBAN / KALENDÁŘ) */}
        {columns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[450px]">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-4 shadow-xs">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Tabulka zatím nemá žádné sloupce
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              Nová tabulka je připravena zcela prázdná. Přidejte sloupce podle svých představ.
            </p>
            <button
              type="button"
              onClick={() => {
                setNewColLabel("");
                setNewColKey("");
                setIsNewColKeyManual(false);
                setShowAddColumnModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Přidat první sloupec
            </button>
          </div>
        ) : activeView === "GRID" ? (
          <>
            <div className="flex-1 overflow-auto px-6 py-2">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden inline-block min-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    {/* 1. Řádek hlavičky: Názvy sloupců s řazením */}
                    <tr className="bg-[#f8fafc] border-b border-slate-200 text-slate-700 font-semibold text-[11px] select-none">
                      <th
                        className="py-2.5 px-3 w-10 text-center select-none cursor-pointer"
                        onClick={handleToggleSelectAll}
                        title="Vybrat všechny záznamy na aktuální stránce"
                      >
                        <input
                          type="checkbox"
                          checked={
                            paginatedRecords.length > 0 &&
                            paginatedRecords.every((r) => selectedRecordIds.includes(r.id))
                          }
                          readOnly
                          className="w-5 h-5 rounded text-[#1e60f0] accent-[#1e60f0] pointer-events-none"
                        />
                      </th>
                      {visibleColumns.map((col) => {
                        const isSorted = sortKey === col.key;
                        const isDragging = draggedColKey === col.key;
                        const isDragOver = dragOverColKey === col.key;
                        const colWidth = columnWidths[col.key];

                        return (
                          <th
                            key={col.id}
                            draggable
                            onDragStart={(e) => handleHeaderDragStart(e, col.key)}
                            onDragOver={(e) => handleHeaderDragOver(e, col.key)}
                            onDrop={(e) => handleHeaderDrop(e, col.key)}
                            onDragEnd={() => {
                              setDraggedColKey(null);
                              setDragOverColKey(null);
                            }}
                            onClick={() => handleSort(col.key)}
                            title="Kliknutím seřadíte, přetažením myší změníte pořadí sloupce"
                            style={{
                              width: colWidth ? `${colWidth}px` : undefined,
                              minWidth: colWidth ? `${colWidth}px` : "140px",
                            }}
                            className={`relative py-2.5 px-3 border-r border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-all select-none group/th ${
                              isDragging
                                ? "opacity-30 bg-blue-100 border-dashed border-2 border-blue-400"
                                : isDragOver
                                ? "border-l-4 border-l-[#1e60f0] bg-blue-50/70"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between pointer-events-none pr-1">
                              <span className="truncate">{col.label}</span>
                              <div className="flex items-center gap-1 shrink-0 ml-1 text-slate-400">
                                {isSorted ? (
                                  sortDirection === "asc" ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-[#1e60f0]" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-[#1e60f0]" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                                )}
                              </div>
                            </div>

                            {/* Resizer úchyt na pravé hraně sloupce */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(col.key, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#1e60f0]/60 active:bg-[#1e60f0] z-20"
                              title="Tažením změníte šířku sloupce"
                            />
                          </th>
                        );
                      })}
                  </tr>

                  {/* 2. Řádek hlavičky: Filtrování per sloupec */}
                  {showColumnFilters && (
                    <tr className="bg-white border-b border-slate-200 text-xs">
                      <td className="py-1 px-2 text-center text-slate-400">
                        {Object.values(columnFilters).some((v) => v && v !== "ALL") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setColumnFilters({});
                              setPageIndex(1);
                            }}
                            title="Vymazat sloupcové filtry"
                            className="w-4 h-4 rounded text-rose-500 hover:text-white hover:bg-rose-500 flex items-center justify-center font-bold text-[10px] mx-auto cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        ) : (
                          <Filter className="w-3 h-3 mx-auto text-slate-400" />
                        )}
                      </td>
                      {visibleColumns.map((col) => {
                        const filterVal = columnFilters[col.key] || "";
                        const isSelect = col.type === "SELECT";
                        const isCheckbox = col.type === "CHECKBOX";
                        const options = Array.isArray(col.config?.options)
                          ? (col.config?.options as { id: string; label: string }[])
                          : [];
                        const colWidth = columnWidths[col.key];

                        return (
                          <td
                            key={`filter-${col.id}`}
                            style={{
                              width: colWidth ? `${colWidth}px` : undefined,
                              minWidth: colWidth ? `${colWidth}px` : "140px",
                            }}
                            className="p-1 border-r border-slate-200"
                          >
                            {isSelect ? (
                              <div className="relative flex items-center">
                                <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                                <select
                                  value={filterVal || "ALL"}
                                  onChange={(e) => {
                                    setColumnFilters((prev) => ({
                                      ...prev,
                                      [col.key]: e.target.value === "ALL" ? "" : e.target.value,
                                    }));
                                    setPageIndex(1);
                                  }}
                                  className={`w-full py-1 pl-6 pr-2 text-[11px] bg-slate-50 border rounded focus:outline-none focus:ring-1 focus:ring-[#1e60f0] cursor-pointer ${filterVal
                                    ? "border-blue-500 bg-blue-50/50 text-blue-800 font-bold"
                                    : "border-slate-200 text-slate-600"
                                    }`}
                                >
                                  <option value="ALL">Filtr...</option>
                                  {options.map((opt) => (
                                    <option key={opt.id} value={opt.label}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : isCheckbox ? (
                              <select
                                value={filterVal || "ALL"}
                                onChange={(e) => {
                                  setColumnFilters((prev) => ({
                                    ...prev,
                                    [col.key]: e.target.value === "ALL" ? "" : e.target.value,
                                  }));
                                  setPageIndex(1);
                                }}
                                className={`w-full py-1 px-2 text-[11px] bg-slate-50 border rounded focus:outline-none focus:ring-1 focus:ring-[#1e60f0] cursor-pointer ${filterVal
                                  ? "border-blue-500 bg-blue-50/50 text-blue-800 font-bold"
                                  : "border-slate-200 text-slate-600"
                                  }`}
                              >
                                <option value="ALL">Vše</option>
                                <option value="TRUE">✅ Ano</option>
                                <option value="FALSE">❌ Ne</option>
                              </select>
                            ) : (
                              <div className="relative flex items-center">
                                <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={filterVal}
                                  onChange={(e) => {
                                    setColumnFilters((prev) => ({
                                      ...prev,
                                      [col.key]: e.target.value,
                                    }));
                                    setPageIndex(1);
                                  }}
                                  placeholder="Filtr..."
                                  className={`w-full py-1 pl-6 pr-5 text-[11px] bg-slate-50 border rounded focus:outline-none focus:ring-1 focus:ring-[#1e60f0] ${filterVal
                                    ? "border-blue-500 bg-blue-50/50 text-blue-800 font-bold"
                                    : "border-slate-200 text-slate-700"
                                    }`}
                                />
                                {filterVal && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setColumnFilters((prev) => ({
                                        ...prev,
                                        [col.key]: "",
                                      }));
                                      setPageIndex(1);
                                    }}
                                    className="absolute right-1 text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="py-10 text-center text-slate-400 text-xs">
                        Žádné záznamy neodpovídají zadanému filtru.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record, index) => {
                      const isRowSelected = selectedRecordIds.includes(record.id);
                      const rowNumber = (pageIndex - 1) * pageSize + index + 1;
                      const isDirty = !!dirtyChanges[record.id];
                      const { rowStyle, cellStyles } = getFormattingStyles(record);

                      return (
                        <tr
                          key={record.id}
                          onClick={(e) => handleRowClick(record, e)}
                          onDoubleClick={() => handleRowDoubleClick(record)}
                          style={!isRowSelected ? rowStyle : undefined}
                          className={`transition-colors cursor-pointer group ${isRowSelected
                            ? "bg-[#dce9ff] border-l-4 border-l-[#1e60f0] font-medium"
                            : isDirty
                              ? "bg-amber-50/50 hover:bg-amber-100/60 border-l-4 border-l-amber-500"
                              : !rowStyle?.backgroundColor
                                ? "hover:bg-blue-50/20 border-l-4 border-l-transparent"
                                : "hover:brightness-95 border-l-4 border-l-transparent"
                            }`}
                        >
                          <td
                            className="py-2 px-3 text-center select-none cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRecord(record.id);
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                readOnly
                                className="w-5 h-5 rounded text-[#1e60f0] accent-[#1e60f0] pointer-events-none"
                              />
                            </div>
                          </td>

                          {visibleColumns.map((col) => {
                            const val = (record.data as Record<string, unknown>)?.[col.key] ?? (record as any)[col.key];
                            const isStatusCol = col.key.toLowerCase().includes("stav") || col.key.toLowerCase().includes("status");
                            const isPriorityCol = col.key.toLowerCase().includes("priorit");
                            const rawOpts = (col.config as any)?.options;
                            const selectOptions: SelectOption[] = Array.isArray(rawOpts)
                              ? rawOpts.map((o: any, idx: number) => {
                                  if (typeof o === "string") {
                                    return { id: o, label: o, color: undefined };
                                  }
                                  return {
                                    id: o?.id || o?.label || `opt_${idx}`,
                                    label: o?.label || String(o),
                                    color: o?.color,
                                  };
                                })
                              : [];
                            const colConfig = (col.config as any) || {};
                            const badgeShape = colConfig.badgeShape || "circle";
                            const badgeStyle = colConfig.badgeStyle || "subtle";
                            const badgeDisplayType = colConfig.badgeDisplayType;
                            const colWidth = columnWidths[col.key];
                            const cellStyle = cellStyles[col.key];

                            return (
                              <td
                                key={col.id}
                                style={{
                                  width: colWidth ? `${colWidth}px` : undefined,
                                  maxWidth: colWidth ? `${colWidth}px` : undefined,
                                  ...(cellStyle || {}),
                                }}
                                className="py-2 px-3 border-r border-slate-200 text-xs overflow-hidden"
                                onClick={(e) => {
                                  const input = e.currentTarget.querySelector("input, select, textarea") as HTMLElement | null;
                                  if (input && e.target !== input) {
                                    input.focus();
                                  }
                                }}
                              >
                                {col.type === "CHECKBOX" ? (
                                  <div
                                    className="flex items-center justify-center py-1 cursor-pointer w-full h-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCellChange(record.id, col.key, !val);
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!val}
                                      readOnly
                                      className="w-5 h-5 rounded text-[#1e60f0] accent-[#1e60f0] pointer-events-none"
                                    />
                                  </div>
                                ) : isPriorityCol ? (
                                  /* Styl priorit: TOP s plamínkem, MED s lístkem */
                                  <div className="flex items-center gap-1.5">
                                    {String(val).toUpperCase().includes("TOP") || String(val).toUpperCase().includes("HIGH") ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                        <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                        <span>TOP</span>
                                      </span>
                                    ) : String(val).toUpperCase().includes("MED") || String(val).toUpperCase().includes("STŘEDNÍ") ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                        <Leaf className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                                        <span>MED</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-xs">{String(val || "")}</span>
                                    )}
                                  </div>
                                ) : col.type === "SELECT" || isStatusCol || selectOptions.length > 0 ? (
                                  /* Barevný štítek s odrážkou (kruh/čtverec) nebo pozadím dle konfigurace */
                                  <SelectBadge
                                    value={val !== undefined && val !== null ? String(val) : ""}
                                    options={selectOptions}
                                    badgeShape={badgeShape}
                                    badgeStyle={badgeStyle}
                                    badgeDisplayType={badgeDisplayType}
                                    onChange={(newVal) => handleCellChange(record.id, col.key, newVal)}
                                  />
                                ) : col.type === "FILE" ? (
                                  val ? (
                                    <div className="flex items-center">
                                      <a
                                        href={String(val)}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-medium transition-colors max-w-[180px] truncate"
                                        title={String(val)}
                                      >
                                        <Paperclip className="w-3 h-3 shrink-0" />
                                        <span className="truncate">
                                          {(() => {
                                            const s = String(val);
                                            if (s.startsWith("data:")) return "Soubor";
                                            try {
                                              const u = new URL(s, "http://localhost");
                                              const p = u.pathname.substring(u.pathname.lastIndexOf("/") + 1);
                                              return p || s;
                                            } catch {
                                              return s;
                                            }
                                          })()}
                                        </span>
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic">—</span>
                                  )
                                ) : col.type === "IMAGE" ? (
                                  val ? (
                                    <div className="flex items-center">
                                      <img
                                        src={String(val)}
                                        alt={col.label}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLightboxImage(String(val));
                                        }}
                                        className="w-7 h-7 rounded-md object-cover border border-slate-200 shadow-2xs hover:scale-125 transition-transform cursor-pointer"
                                        title="Kliknutím zobrazíte celý obrázek"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic">—</span>
                                  )
                                ) : col.type === "URL" || (typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"))) ? (
                                  <a
                                    href={String(val)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[#1e60f0] hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                    title={String(val)}
                                  >
                                    <Globe className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{String(val)}</span>
                                  </a>
                                ) : col.type === "LONG_TEXT" ? (
                                  <div
                                    className="truncate max-w-[220px] text-slate-700 select-text"
                                    title={String(val || "")}
                                  >
                                    {String(val || "")}
                                  </div>
                                ) : col.type === "DATE" ? (
                                  <DateCell
                                    value={val}
                                    disabled={!userPermissions.canUpdate}
                                    onChange={(newVal) => handleCellChange(record.id, col.key, newVal)}
                                  />
                                ) : (
                                  <input
                                    type={
                                      col.type === "NUMBER" || col.type === "CURRENCY" ? "number" : "text"
                                    }
                                    value={val !== undefined && val !== null ? String(val) : ""}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleCellChange(
                                        record.id,
                                        col.key,
                                        col.type === "NUMBER" || col.type === "CURRENCY"
                                          ? Number(e.target.value)
                                          : e.target.value
                                      )
                                    }
                                    className={`w-full text-xs py-1 px-2 rounded border border-transparent hover:border-slate-300 focus:border-[#1e60f0] bg-transparent ${col.type === "CURRENCY" || col.type === "NUMBER"
                                      ? "text-right font-mono"
                                      : ""
                                      }`}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>

              {/* Patičkové agregace (Součty a průměry) */}
              {showTotals && (
                <tfoot>
                  <tr className="bg-[#f8fafc] border-t-2 border-slate-300 text-xs font-bold text-slate-800">
                    <td className="py-2 px-3 text-center text-slate-500 text-[10px]">Σ</td>
                    {visibleColumns.map((col) => {
                      const footer = calculateFooter(col);
                      return (
                        <td key={col.id} className="py-2 px-3 border-r border-slate-200">
                          {footer ? (
                            <div className="text-right font-mono text-[11px]">
                              <div>Součet: {footer.sum}</div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                Průměr: {footer.avg}
                              </div>
                            </div>
                          ) : null}
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* 4. FOOTER (Patička: Odstranit filtr, Stránkování, Počet řádků, Součty Σ) */}
          <div className="bg-white border-t border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs text-slate-600 select-none">
            {/* Vlevo: Tlačítko Odstranit filtr */}
            <button
              onClick={() => {
                setGlobalSearch("");
                setStatusFilter("ALL");
                setColumnFilters({});
                setPageIndex(1);
              }}
              disabled={activeFilterCount === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${activeFilterCount > 0
                ? "bg-[#eaf2ff] hover:bg-[#d8e8ff] text-[#1e60f0] border-[#c3daf9] shadow-sm cursor-pointer"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-default opacity-60"
                }`}
            >
              <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-bold">
                ⊙
              </span>
              <span>Odstranit filtr</span>
            </button>

            {/* Uprostřed: Stránkování |< < 1 2 > >|  25 v  Počet řádků: X */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPageIndex(1)}
                  disabled={pageIndex <= 1}
                  title="První strana"
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                  disabled={pageIndex <= 1}
                  title="Předchozí strana"
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Čísla stránek */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pNum = i + 1;
                  if (totalPages > 5 && pageIndex > 3) {
                    pNum = Math.min(pageIndex - 2 + i, totalPages - (4 - i));
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPageIndex(pNum)}
                      className={`w-7 h-7 rounded text-xs font-semibold transition-colors cursor-pointer ${pageIndex === pNum
                        ? "bg-[#eaf2ff] text-[#1e60f0] font-bold border border-[#c3daf9]"
                        : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                  disabled={pageIndex >= totalPages}
                  title="Další strana"
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPageIndex(totalPages)}
                  disabled={pageIndex >= totalPages}
                  title="Poslední strana"
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Volba počtu řádků na stranu */}
              <div className="flex items-center gap-1.5">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageIndex(1);
                  }}
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded hover:border-slate-400 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-500 text-xs">
                  Počet řádků: <strong className="text-slate-800">{filteredAndSortedRecords.length}</strong>
                </span>
              </div>
            </div>

            {/* Vpravo: Tlačítko součtů Σ */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTotals(!showTotals)}
                title="Přepnout zobrazení součtů (Σ)"
                className={`w-7 h-7 rounded text-sm font-bold flex items-center justify-center transition-colors border cursor-pointer ${showTotals
                  ? "bg-[#eaf2ff] text-[#1e60f0] border-[#c3daf9]"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
              >
                Σ
              </button>
            </div>
          </div>
        </>
      ) : activeView === "KANBAN" ? (
        <KanbanView
          records={filteredAndSortedRecords}
          columns={columns}
          table={table}
          badgeShape={badgeShape}
          onRecordClick={(record) => {
            setSelectedRecordForDetail(record);
            setIsDetailModalOpen(true);
          }}
          onStatusChange={(recordId, statusColKey, newStatus) => {
            handleCellChange(recordId, statusColKey, newStatus);
          }}
          onAddNewRecord={async (initialData) => {
            try {
              setLoading(true);
              const res = await fetch(`/api/tables/${table.id}/records`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: initialData || {} }),
              });
              const data = await res.json();
              if (res.ok) {
                setRecords([data.record, ...records]);
                setOriginalRecords([data.record, ...originalRecords]);
                setSelectedRecordForDetail(data.record);
                setIsDetailModalOpen(true);
              }
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }}
        />
      ) : (
        <CalendarView
          records={filteredAndSortedRecords}
          columns={columns}
          table={table}
          badgeShape={badgeShape}
          onRecordClick={(record) => {
            setSelectedRecordForDetail(record);
            setIsDetailModalOpen(true);
          }}
          onAddNewRecord={async (initialData) => {
            try {
              setLoading(true);
              const res = await fetch(`/api/tables/${table.id}/records`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: initialData || {} }),
              });
              const data = await res.json();
              if (res.ok) {
                setRecords([data.record, ...records]);
                setOriginalRecords([data.record, ...originalRecords]);
                setSelectedRecordForDetail(data.record);
                setIsDetailModalOpen(true);
              }
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }}
        />
      )
      }

      {/* 5. FLOATING ACTION BUTTON (FAB): Nový řádek vpravo dole (dle požadavku uživatele) */}
      {userPermissions.canCreate && (
        <button
          onClick={handleAddRow}
          disabled={loading}
          title="Přidat nový řádek (+)"
          className="fixed bottom-7 right-7 z-40 w-14 h-14 rounded-full bg-[#1e60f0] hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group cursor-pointer"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* 6. FLOATING HELP BUTTON: Centrum nápovědy v pravém dolním rohu */}
      <button
        type="button"
        onClick={() => setShowHelpModal(true)}
        title="Centrum nápovědy a průvodce (?)"
        className="fixed bottom-2 right-2 z-30 w-7 h-7 rounded-full bg-[#1e60f0] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-white"
      >
        ?
      </button>

      {/* 7. MODÁLNÍ OKNO DETAILU A EDITACE ZÁZNAMU */}
      {
        isDetailModalOpen && selectedRecordForDetail && (
          <RecordDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedRecordForDetail(null);
            }}
            record={selectedRecordForDetail}
            table={table}
            columns={columns}
            workspaceSlug={workspaceSlug}
            appId={appId}
            badgeShape={badgeShape}
            readOnly={!userPermissions.canUpdate}
            onSave={handleSaveRecordFromModal}
            onDuplicate={userPermissions.canCreate ? ((recId) => handleDuplicateRow(recId)) : undefined}
            onDelete={userPermissions.canDelete ? ((recId) => handleDeleteRow(recId)) : undefined}
          />
        )
      }

      {/* 4. PLOVOUCÍ LIŠTA PRO HROMADNÉ ULOŽENÍ NEBO ZAHOZENÍ ZMĚN (DIRTY STATE) */}
      {
        Object.keys(dirtyChanges).length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400" />
              <span className="text-xs font-semibold text-slate-100">
                Máte <strong className="text-amber-300 font-bold">{Object.keys(dirtyChanges).length}</strong>{" "}
                {Object.keys(dirtyChanges).length === 1
                  ? "neuložený řádek"
                  : Object.keys(dirtyChanges).length < 5
                    ? "neuložené řádky"
                    : "neuložených řádků"}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <button
              onClick={handleDiscardChanges}
              disabled={savingBatch}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zahodit změny</span>
            </button>

            <button
              onClick={handleSaveBatch}
              disabled={savingBatch}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold shadow-md shadow-emerald-900/50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {savingBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ukládám...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Uložit všechny změny
                </>
              )}
            </button>
          </div>
        )
      }

      {/* 5. MODÁLNÍ OKNO: OCR VYTĚŽOVÁNÍ FAKTUR Z PDF / OBRÁZKU */}
      {
        showOcrModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ScanText className="w-4 h-4 text-indigo-600" /> Vytěžování faktury z PDF nebo obrázku (OCR)
                </h3>
                <button
                  onClick={() => {
                    setShowOcrModal(false);
                    setOcrResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {!ocrResult ? (
                  <form onSubmit={handleOcrUpload} className="space-y-4">
                    <p className="text-slate-600 leading-relaxed">
                      Nahrajte fakturu ve formátu <strong>PDF</strong> nebo jako sken / fotografii (
                      <strong>JPG, PNG</strong>). Systém automaticky vytěží dodavatele, IČO, číslo
                      dokladu, variabilní symbol, částku a datum splatnosti.
                    </p>

                    <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50/30 hover:border-indigo-400 transition-colors">
                      <input
                        type="file"
                        accept=".pdf, .png, .jpg, .jpeg"
                        onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowOcrModal(false)}
                        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                      >
                        Zrušit
                      </button>
                      <button
                        type="submit"
                        disabled={!ocrFile || ocrLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {ocrLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Vytěžuji text a fakturu...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Spustit vytěžení faktury
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Náhled vytěžených dat */
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between">
                      <span className="font-semibold">
                        Faktura úspěšně vytěžena! Zkontrolujte hodnoty před uložením:
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Dodavatel</span>
                        <input
                          type="text"
                          value={ocrResult.supplier}
                          onChange={(e) => setOcrResult({ ...ocrResult, supplier: e.target.value })}
                          className="w-full p-1.5 bg-white border rounded text-xs font-semibold mt-0.5"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Číslo faktury</span>
                        <input
                          type="text"
                          value={ocrResult.invoiceNumber}
                          onChange={(e) => setOcrResult({ ...ocrResult, invoiceNumber: e.target.value })}
                          className="w-full p-1.5 bg-white border rounded text-xs font-semibold mt-0.5"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">IČO</span>
                        <input
                          type="text"
                          value={ocrResult.ico}
                          onChange={(e) => setOcrResult({ ...ocrResult, ico: e.target.value })}
                          className="w-full p-1.5 bg-white border rounded text-xs font-semibold mt-0.5"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Částka k úhradě</span>
                        <input
                          type="number"
                          value={ocrResult.totalAmount}
                          onChange={(e) => setOcrResult({ ...ocrResult, totalAmount: Number(e.target.value) })}
                          className="w-full p-1.5 bg-white border rounded text-xs font-bold text-blue-600 mt-0.5"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Splatnost</span>
                        <input
                          type="date"
                          value={ocrResult.dueDate}
                          onChange={(e) => setOcrResult({ ...ocrResult, dueDate: e.target.value })}
                          className="w-full p-1.5 bg-white border rounded text-xs mt-0.5"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Variabilní symbol</span>
                        <input
                          type="text"
                          value={ocrResult.variableSymbol}
                          onChange={(e) => setOcrResult({ ...ocrResult, variableSymbol: e.target.value })}
                          className="w-full p-1.5 bg-white border rounded text-xs mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setOcrResult(null)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                      >
                        Zpět k výběru souboru
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveOcrRecord}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Uložit do tabulky
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Modál: Přidat nový sloupec */}
      {
        showAddColumnModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" /> Přidat nový sloupec
                </h3>
                <button
                  onClick={() => setShowAddColumnModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateColumn} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Název sloupce</label>
                  <input
                    type="text"
                    required
                    value={newColLabel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewColLabel(val);
                      if (!isNewColKeyManual) {
                        const existingKeys = new Set(columns.map((c) => c.key));
                        setNewColKey(generateUniqueColumnKey(slugifyColumnKey(val), existingKeys));
                      }
                    }}
                    placeholder="např. Telefon, Množství..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Systémový klíč (Key)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewColKeyManual(false);
                        const existingKeys = new Set(columns.map((c) => c.key));
                        setNewColKey(generateUniqueColumnKey(slugifyColumnKey(newColLabel), existingKeys));
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Vygenerovat klíč automaticky z názvu"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Generovat z názvu
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newColKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewColKey(v);
                      setIsNewColKeyManual(!!v.trim());
                    }}
                    placeholder="např. fld_telefon"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Identifikátor pole pro databázi a API (např. <code>fld_telefon</code>)
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Datový typ</label>
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="TEXT">Krátký text</option>
                    <option value="LONG_TEXT">Dlouhý text / Poznámka</option>
                    <option value="NUMBER">Číslo</option>
                    <option value="CURRENCY">Měna (Kč / €)</option>
                    <option value="DATE">Datum</option>
                    <option value="CHECKBOX">Přepínač (Ano / Ne)</option>
                    <option value="FILE">Soubor / Dokument (PDF, atd.)</option>
                    <option value="IMAGE">Obrázek</option>
                    <option value="URL">Webový odkaz (URL)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="req_cb"
                    checked={newColRequired}
                    onChange={(e) => setNewColRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor="req_cb" className="text-slate-700 font-medium">
                    Povinné pole
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddColumnModal(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Uložit sloupec
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modál: Import z Excelu */}
      {
        showImportModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-600" /> Importovat data z Excelu (.xlsx)
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleImportSubmit} className="p-5 space-y-4 text-xs">
                <p className="text-slate-600">
                  Vyberte soubor <strong>.xlsx</strong> nebo <strong>.csv</strong>. Systém automaticky
                  spáruje sloupce podle názvů v hlavičce.
                </p>

                {importMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
                    {importMsg}
                  </div>
                )}

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Zavřít
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || importing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Zahájit import
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Modál: Zveřejnit webový formulář (Iframe & Veřejný odkaz) */}
      {showIframeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Hlavička */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" /> Zveřejnění webového formuláře na web (Iframe & Odkaz)
              </h3>
              <button
                onClick={() => setShowIframeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto">
              {/* Stavový box (Aktivní / Neaktivní) */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                  isFormPublic
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isFormPublic
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-2">
                      {isFormPublic ? "Formulář je aktivní a zveřejněný" : "Formulář je aktuálně vypnutý"}
                      {isFormPublic && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Veřejný
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {isFormPublic
                        ? "Návštěvníci mohou odesílat data přímo do vaší tabulky."
                        : "Odkaz ani Iframe formulář není přístupný veřejnosti."}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingFormShare}
                  onClick={() => handleTogglePublicForm(!isFormPublic)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isFormPublic
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  }`}
                >
                  {savingFormShare ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isFormPublic ? (
                    "Zrušit zveřejnění"
                  ) : (
                    "Zveřejnit formulář"
                  )}
                </button>
              </div>

              {/* Sekce pro aktivní formulář: Odkaz a Iframe kód */}
              {isFormPublic && shareToken ? (
                <>
                  {/* Přímý odkaz */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Přímý veřejný odkaz na formulář
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/form/${shareToken}`}
                        className="flex-1 p-2.5 font-mono text-[11px] bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/form/${shareToken}`;
                          navigator.clipboard.writeText(url);
                          showToast("Odkaz zkopírován do schránky!", "success");
                        }}
                        className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" /> Kopírovat
                      </button>
                      <a
                        href={`/share/form/${shareToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1e60f0] border border-blue-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        Otevřít <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* HTML Iframe kód */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      HTML kód pro vložení na web (Iframe – WordPress, Webflow, Shoptet)
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        rows={3}
                        value={iframeSnippet}
                        className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(iframeSnippet);
                          showToast("HTML kód iframe zkopírován!", "success");
                        }}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Kopírovat kód
                      </button>
                    </div>
                  </div>

                  {/* Přizpůsobení formuláře */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" /> Přizpůsobení formuláře
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Nadpis formuláře</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="např. Kontaktní formulář"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Popis formuláře</label>
                        <input
                          type="text"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Instrukce pro vyplnění..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Zobrazit pole ve formuláři ({formFields.length}/{columns.length})
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                        {columns.map((c) => {
                          const isChecked = formFields.includes(c.key);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormFields([...formFields, c.key]);
                                  } else {
                                    setFormFields(formFields.filter((k) => k !== c.key));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                              />
                              <span className="truncate">{c.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={savingFormShare}
                        onClick={handleSaveFormSettings}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {savingFormShare ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        Uložit nastavení formuláře
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Vytvořte si veřejný webový formulář</h4>
                    <p className="text-slate-500 text-[11px] max-w-sm mx-auto mt-1 leading-relaxed">
                      Zveřejněním získáte odkaz a HTML iframe kód. Každý návštěvník vašeho webu bude moci formulář vyplnit a data se automaticky zapíší jako nový záznam do této tabulky.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingFormShare}
                    onClick={() => handleTogglePublicForm(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20 inline-flex items-center gap-2 cursor-pointer"
                  >
                    {savingFormShare ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    Zveřejnit formulář jedním kliknutím
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modál pro hromadnou úpravu vybraných záznamů */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedCount={selectedRecordIds.length}
        columns={columns}
        badgeShape={badgeShape}
        onApply={handleBulkEditApply}
      />

      {/* Modál pro konfiguraci widgetu nad tabulkou */}
      <WidgetConfigModal
        isOpen={isWidgetModalOpen}
        onClose={() => {
          setIsWidgetModalOpen(false);
          setEditingWidget(null);
        }}
        onSave={handleSaveWidget}
        onDelete={handleDeleteWidget}
        widgetToEdit={editingWidget}
        columns={columns}
      />

      {/* Modál pro JavaScript skriptování tabulky */}
      <ScriptEditorModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        tableId={table.id}
        tableName={table.name}
        columns={columns}
        initialScript={(table as any).customScript || ""}
        onSave={async (scriptCode) => {
          await fetch(`/api/tables/${table.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customScript: scriptCode }),
          });
          (table as any).customScript = scriptCode;
        }}
      />

      {/* MODÁL: ULOŽIT POHLED */}
      {showSaveViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#1e60f0]" />
                <h3 className="text-sm font-bold text-slate-900">Uložit nastavení zobrazení</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveViewModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsNewView} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Název pohledu
                </label>
                <input
                  type="text"
                  required
                  placeholder="např. Výchozí přehled, Finanční pohled..."
                  value={saveViewName}
                  onChange={(e) => setSaveViewName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1e60f0] focus:ring-1 focus:ring-[#1e60f0]"
                  autoFocus
                />
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#1e60f0]" />
                  <span>Co se do pohledu uloží:</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 pl-1 space-y-0.5">
                  <li>Nastavené šířky všech sloupců</li>
                  <li>Pořadí sloupců</li>
                  <li>Skryté a zobrazené sloupce</li>
                  <li>Aktivní řazení a filtry</li>
                </ul>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveViewIsDefault}
                  onChange={(e) => setSaveViewIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1e60f0] cursor-pointer"
                />
                <span className="font-medium">Nastavit jako výchozí pohled pro tabulku</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSaveViewModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={savingView || !saveViewName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#1e60f0] hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingView ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Uložit pohled</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modál: Podmíněné formátování */}
      <ConditionalFormattingModal
        isOpen={showFormattingModal}
        onClose={() => setShowFormattingModal(false)}
        columns={columns}
        rules={formattingRules}
        onSave={handleSaveFormattingRules}
      />

      {/* Lightbox pro náhled celého obrázku ze sloupce */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Plný náhled obrázku"
              className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain mx-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* MODÁL: KLÁVESOVÉ ZKRATKY */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[#1e60f0]" />
                <h3 className="text-sm font-bold text-slate-900">Klávesové zkratky v tabulce</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500 mb-4">
                Používejte tyto zkratky pro bleskovou práci s daty a záznamy:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Uložit všechny rozpracované změny</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">Ctrl</kbd>
                    <span className="text-slate-400 text-xs">+</span>
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">S</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Rychlé fulltextové vyhledávání</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">Ctrl</kbd>
                    <span className="text-slate-400 text-xs">+</span>
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">F</kbd>
                    <span className="text-slate-400 text-xs mx-1">nebo</span>
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">/</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Přidat nový řádek do tabulky</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">Ctrl</kbd>
                    <span className="text-slate-400 text-xs">+</span>
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">N</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Rychlý export dat do Excelu</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">Ctrl</kbd>
                    <span className="text-slate-400 text-xs">+</span>
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">E</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Zrušit výběr / vyčistit hledání / zavřít dialogy</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">Esc</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Zobrazit nápovědu klávesových zkratek</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">?</kbd>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Rozumím
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODÁL: VEŘEJNÉ REST API & AI INTEGRACE */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Veřejné REST API & AI Přístup pro &quot;{table.name}&quot;
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tuto tabulku můžete plně ovládat a číst přes zabezpečené REST API pomocí svého firemního API tokenu. Vhodné pro napojení ChatGPT Custom GPT, Claude, Make.com, n8n nebo vašich interních skriptů.
              </p>

              {/* ID Tabulky */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Unikátní ID této tabulky (tableId)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-800 select-all">
                    {table.id}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(table.id);
                      showToast("Table ID zkopírováno do schránky", "success");
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Kopírovat ID tabulky"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* REST API Endpoints */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Dostupné API endpointy
                </h4>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-bold mr-2">GET</span>
                      <span className="text-slate-300">/api/v1/tables/{table.id}/records</span>
                    </div>
                    <span className="text-[10px] font-sans text-slate-400">Čtení dat</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 font-bold mr-2">POST</span>
                      <span className="text-slate-300">/api/v1/tables/{table.id}/records</span>
                    </div>
                    <span className="text-[10px] font-sans text-slate-400">Nový záznam</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-bold mr-2">PATCH</span>
                      <span className="text-slate-300">/api/v1/tables/{table.id}/records/&#123;recordId&#125;</span>
                    </div>
                    <span className="text-[10px] font-sans text-slate-400">Úprava záznamu</span>
                  </div>
                </div>
              </div>

              {/* Ukázka cURL dotazu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Příklad volání cURL
                  </h4>
                  <button
                    type="button"
                    onClick={async () => {
                      const curlText = `curl -X POST "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3005"}/api/v1/tables/${table.id}/records" \\
  -H "Authorization: Bearer <VÁŠ_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"${columns[0]?.key || "nazev"}": "Nová hodnota"}}'`;
                      await navigator.clipboard.writeText(curlText);
                      showToast("cURL ukázka zkopírována do schránky", "success");
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Kopírovat cURL
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto select-all leading-relaxed">
{`curl -X POST "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3005"}/api/v1/tables/${table.id}/records" \\
  -H "Authorization: Bearer <VÁŠ_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"${columns[0]?.key || "nazev"}": "Nová hodnota"}}'`}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/${workspaceSlug}/settings`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Spravovat a vytvořit API klíče v Nastavení</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTRUM NÁPOVĚDY A PRŮVODCE SYSTÉMEM */}
      <HelpCenterModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        workspaceSlug={workspaceSlug}
      />

      {/* Plovoucí Toast notifikace */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20"
              : toast.type === "error"
              ? "bg-red-600 text-white border-red-700 shadow-red-900/20"
              : "bg-slate-900 text-white border-slate-800 shadow-slate-950/20"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          ) : toast.type === "error" ? (
            <X className="w-4 h-4 text-red-200 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-300 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
