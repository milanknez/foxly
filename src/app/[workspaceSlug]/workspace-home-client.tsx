"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Table as TableIcon,
  LayoutDashboard,
  Users,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Check,
  Loader2,
  X,
  Star,
  Download,
  Briefcase,
  LifeBuoy,
  CheckSquare,
  Boxes,
  HelpCircle,
  ExternalLink,
  GripVertical,
  Calendar,
  Scissors,
  Utensils,
} from "lucide-react";
import { APP_TEMPLATES, AppTemplate } from "@/lib/app-templates";
import { useDialog } from "@/components/ui/dialog-provider";

interface TableInfo {
  id: string;
  name: string;
  sortOrder?: number;
  _count: {
    records: number;
    columns: number;
  };
}

interface DashboardInfo {
  id: string;
  name: string;
  sortOrder?: number;
  _count: {
    widgets: number;
  };
}

export interface UnifiedItem {
  id: string;
  type: "table" | "dashboard";
  name: string;
  sortOrder: number;
  countLabel: string;
  href: string;
}

interface AppInfo {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tables: TableInfo[];
  dashboards: DashboardInfo[];
}

const iconComponentMap: Record<string, React.ElementType> = {
  Briefcase,
  LifeBuoy,
  CheckSquare,
  Boxes,
  Layers,
  FileSpreadsheet,
  Calendar,
  Scissors,
  Utensils,
};

export default function WorkspaceHomeClient({
  workspaceSlug,
  workspaceName,
  userName,
  isPrivileged,
  apps,
  totalTables,
  totalRecords,
}: {
  workspaceSlug: string;
  workspaceName: string;
  userName: string;
  isPrivileged: boolean;
  apps: AppInfo[];
  totalTables: number;
  totalRecords: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, alert } = useDialog();

  // Modály
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);

  // Formulář pro prázdnou aplikaci
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [creatingApp, setCreatingApp] = useState(false);

  // Šablony
  const [templateCategory, setTemplateCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [installingTemplateId, setInstallingTemplateId] = useState<string | null>(null);

  // Automatické otevření modálu šablon z query parametru ?openTemplates=true
  useEffect(() => {
    if (searchParams.get("openTemplates") === "true") {
      setShowTemplatesModal(true);
    }
  }, [searchParams]);

  // Pomocná funkce pro sestavení sjednoceného seznamu položek pro drag & drop
  const buildItemsByApp = (appsList: AppInfo[]): Record<string, UnifiedItem[]> => {
    const map: Record<string, UnifiedItem[]> = {};
    for (const app of appsList) {
      const items: UnifiedItem[] = [
        ...app.tables.map((t) => ({
          id: t.id,
          type: "table" as const,
          name: t.name,
          sortOrder: t.sortOrder ?? 0,
          countLabel: `${t._count.records} záznamů`,
          href: `/${workspaceSlug}/${app.id}/${t.id}`,
        })),
        ...app.dashboards.map((d) => ({
          id: d.id,
          type: "dashboard" as const,
          name: d.name,
          sortOrder: d.sortOrder ?? 0,
          countLabel: `${d._count.widgets} widgetů`,
          href: `/${workspaceSlug}/${app.id}/dashboard/${d.id}`,
        })),
      ].sort((a, b) => a.sortOrder - b.sortOrder);
      map[app.id] = items;
    }
    return map;
  };

  const [itemsByApp, setItemsByApp] = useState<Record<string, UnifiedItem[]>>(() => buildItemsByApp(apps));
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [activeDragAppId, setActiveDragAppId] = useState<string | null>(null);
  const [isSavingAppId, setIsSavingAppId] = useState<string | null>(null);

  useEffect(() => {
    setItemsByApp(buildItemsByApp(apps));
  }, [apps, workspaceSlug]);

  const handleDragStart = (e: React.DragEvent, appId: string, itemId: string) => {
    setDraggedItemId(itemId);
    setActiveDragAppId(appId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragOver = (e: React.DragEvent, appId: string, itemId: string) => {
    e.preventDefault();
    if (activeDragAppId !== appId) return;
    e.dataTransfer.dropEffect = "move";
    if (dragOverItemId !== itemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setActiveDragAppId(null);
  };

  const saveAppItemOrder = async (appId: string, newItems: UnifiedItem[]) => {
    setItemsByApp((prev) => ({ ...prev, [appId]: newItems }));
    setIsSavingAppId(appId);
    try {
      const res = await fetch(`/api/apps/${appId}/reorder-items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: newItems.map((item) => ({ id: item.id, type: item.type })),
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error("Chyba při ukládání pořadí:", e);
    } finally {
      setIsSavingAppId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, appId: string, targetItemId: string) => {
    e.preventDefault();
    setDragOverItemId(null);
    if (!draggedItemId || draggedItemId === targetItemId || activeDragAppId !== appId) {
      setDraggedItemId(null);
      setActiveDragAppId(null);
      return;
    }

    const currentList = itemsByApp[appId] || [];
    const oldIndex = currentList.findIndex((i) => i.id === draggedItemId);
    const newIndex = currentList.findIndex((i) => i.id === targetItemId);

    if (oldIndex === -1 || newIndex === -1) {
      setDraggedItemId(null);
      setActiveDragAppId(null);
      return;
    }

    const newItems = [...currentList];
    const [moved] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, moved);

    setDraggedItemId(null);
    setActiveDragAppId(null);

    await saveAppItemOrder(appId, newItems);
  };

  // Vytvoření prázdné aplikace
  const handleCreateEmptyApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    setCreatingApp(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAppName.trim(),
          description: newAppDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.app) {
        setShowNewAppModal(false);
        setNewAppName("");
        setNewAppDesc("");
        router.refresh();
      } else {
        await alert(data.error || "Nepodařilo se vytvořit aplikaci.");
      }
    } catch (err) {
      console.error(err);
      await alert("Chyba při komunikaci se serverem.");
    } finally {
      setCreatingApp(false);
    }
  };

  // Instalace aplikace ze šablony
  const handleInstallTemplate = async (templateId: string) => {
    setInstallingTemplateId(templateId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/apps/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (res.ok && data.app) {
        setShowTemplatesModal(false);
        if (data.firstTableId) {
          router.push(`/${workspaceSlug}/${data.app.id}/${data.firstTableId}`);
        } else {
          router.push(`/${workspaceSlug}/${data.app.id}`);
        }
        router.refresh();
      } else {
        await alert(data.error || "Nepodařilo se nainstalovat šablonu.");
      }
    } catch (err) {
      console.error(err);
      await alert("Chyba při instalaci šablony.");
    } finally {
      setInstallingTemplateId(null);
    }
  };

  // Smazání aplikace
  const handleDeleteApp = async (appId: string, appName: string) => {
    const isConfirmed = await confirm({
      title: `Smazat aplikaci ${appName}?`,
      message: `Opravdu chcete smazat celou aplikaci "${appName}"? Tato akce smaže všechny její tabulky, záznamy i dashboardy a je nevratná.`,
      confirmText: "Smazat aplikaci",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setDeletingAppId(appId);
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        await alert(data.error || "Nepodařilo se smazat aplikaci.");
      }
    } catch (err) {
      console.error(err);
      await alert("Chyba při mazání aplikace.");
    } finally {
      setDeletingAppId(null);
    }
  };

  // Filtrování šablon
  const filteredTemplates = APP_TEMPLATES.filter((tpl) => {
    const matchesCat = templateCategory === "all" || tpl.category === templateCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* 1. HORNÍ UVÍTACÍ BANNER */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Pracovní prostor firmy
          </span>
          <h1 className="text-2xl font-black mt-1">{workspaceName}</h1>
          <p className="text-blue-100 text-sm mt-1">
            Vítejte, {userName}. Zde můžete spravovat aplikace, tabulky a záznamy.
          </p>
        </div>

        {isPrivileged && (
          <div className="flex gap-2">
            <Link
              href={`/${workspaceSlug}/users`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Správa zaměstnanců & Práv
            </Link>
          </div>
        )}
      </div>

      {/* 2. RYCHLÉ STATISTIKY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{apps.length}</div>
            <div className="text-xs text-slate-500">Dostupné aplikace</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{totalTables}</div>
            <div className="text-xs text-slate-500">Dostupné tabulky</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{totalRecords}</div>
            <div className="text-xs text-slate-500">Záznamů k dispozici</div>
          </div>
        </div>
      </div>

      {/* 3. SEZNAM APLIKACÍ A AKCE */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Dostupné firemní aplikace</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                {apps.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Spravujte aplikace firmy, vytvářejte nové nebo instalujte z připravených šablon.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Šablony aplikací</span>
            </button>

            <button
              onClick={() => setShowNewAppModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Nová prázdná aplikace</span>
            </button>
          </div>
        </div>

        {/* Mřížka aplikací */}
        {apps.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Zatím nemáte vytvořené žádné aplikace</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Začněte instalací přednastavené šablony (CRM, Helpdesk, Task manažer) nebo si vytvořte vlastní aplikaci od začátku.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowTemplatesModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 cursor-pointer"
              >
                Vybrat šablonu (Doporučeno)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apps.map((app) => {
              const AppIcon = iconComponentMap[app.icon] || Layers;
              const isDeleting = deletingAppId === app.id;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Hlavička karty */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-3 rounded-xl text-white shadow-xs shrink-0"
                          style={{ backgroundColor: app.color || "#2563eb" }}
                        >
                          <AppIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {app.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {app.description || "Podniková aplikace"}
                          </p>
                        </div>
                      </div>

                      {/* Tlačítko pro smazání aplikace */}
                      {isPrivileged && (
                        <button
                          type="button"
                          onClick={() => handleDeleteApp(app.id, app.name)}
                          disabled={isDeleting}
                          title={`Smazat aplikaci ${app.name}`}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Sjednocený seznam položek (Tabulky a Dashboardy dohromady s Drag & Drop řazením) */}
                    <div className="space-y-2 pt-4 mt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span>Položky ({((itemsByApp[app.id] || []).length)})</span>
                          {isSavingAppId === app.id && (
                            <span className="text-blue-600 font-semibold lowercase flex items-center gap-1 text-[10px]">
                              <Loader2 className="w-3 h-3 animate-spin" /> ukládám pořadí...
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">
                          přetažením myší změníte pořadí
                        </span>
                      </div>

                      {(!itemsByApp[app.id] || itemsByApp[app.id].length === 0) ? (
                        <div className="text-xs text-slate-400 italic py-2">
                          V této aplikaci zatím nejsou žádné tabulky ani dashboardy.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {itemsByApp[app.id].map((item) => {
                            const isDragging = draggedItemId === item.id;
                            const isDragOver = dragOverItemId === item.id;
                            const isDashboard = item.type === "dashboard";

                            return (
                              <div
                                key={`${item.type}-${item.id}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, app.id, item.id)}
                                onDragOver={(e) => handleDragOver(e, app.id, item.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, app.id, item.id)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${isDragging
                                  ? "opacity-30 border-2 border-dashed border-blue-400 bg-blue-50/50"
                                  : isDragOver
                                    ? "border-t-2 border-t-blue-600 bg-blue-50/70"
                                    : isDashboard
                                      ? "bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-100/80 hover:border-emerald-200"
                                      : "bg-slate-50 hover:bg-blue-50/60 border-slate-100 hover:border-blue-200"
                                  }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                  {/* Drag úchyt */}
                                  <div
                                    className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 rounded shrink-0 transition-colors"
                                    title="Přetažením myší změníte pořadí položky"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>

                                  <Link
                                    href={item.href}
                                    className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 group/item"
                                  >
                                    {isDashboard ? (
                                      <LayoutDashboard className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <TableIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                    )}
                                    <span className="text-xs font-semibold text-slate-800 truncate group-hover/item:text-blue-600 transition-colors">
                                      {item.name}
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isDashboard
                                        ? "bg-emerald-100/80 text-emerald-800"
                                        : "bg-slate-200/70 text-slate-600"
                                        }`}
                                    >
                                      {isDashboard ? "Dashboard" : "Tabulka"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                      ({item.countLabel})
                                    </span>
                                  </Link>
                                </div>

                                <Link
                                  href={item.href}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                  title="Otevřít položku"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Celkem {app.tables.reduce((acc, t) => acc + t._count.records, 0)} záznamů
                    </span>
                    <Link
                      href={
                        app.tables[0]
                          ? `/${workspaceSlug}/${app.id}/${app.tables[0].id}`
                          : `/${workspaceSlug}/${app.id}`
                      }
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <span>Otevřít aplikaci</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODÁL: ŠABLONY APLIKACÍ */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Hlavička modálu */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Katalog šablon aplikací</h3>
                  <p className="text-xs text-slate-500">
                    Předpřipravené firemní aplikace s tabulkami, sloupci, dashboardy a ukázkovými daty
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vyhledávání a kategorie */}
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                {[
                  { id: "all", label: "Všechny šablony" },
                  { id: "Gastronomie & Služby", label: "Gastronomie & Služby (Nové)" },
                  { id: "Prodej & Obchod", label: "Prodej & CRM" },
                  { id: "Zákaznická podpora", label: "Zákaznická podpora" },
                  { id: "Řízení projektů", label: "Řízení projektů" },
                  { id: "Provoz & Majetek", label: "Provoz & Majetek" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setTemplateCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${templateCategory === cat.id
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat šablonu..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Seznam karet šablon */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 bg-slate-50/50">
              {filteredTemplates.map((tpl) => {
                const TplIcon = iconComponentMap[tpl.icon] || Layers;
                const isInstalling = installingTemplateId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Horní banner šablony */}
                      <div
                        className="p-5 text-white flex items-center justify-between"
                        style={{ backgroundColor: tpl.color }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-xl shadow-xs">
                            <TplIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                              {tpl.category}
                            </span>
                            <h4 className="text-base font-extrabold">{tpl.name}</h4>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 bg-white text-slate-900 font-extrabold text-[11px] rounded-full shadow-xs">
                          {tpl.badge}
                        </span>
                      </div>

                      {/* Tělo šablony */}
                      <div className="p-5 space-y-4">
                        <p className="text-xs text-slate-600 leading-relaxed">{tpl.description}</p>

                        {/* Obsahuje tabulky */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Obsahuje tabulky:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {tpl.tables.map((t) => (
                              <span
                                key={t.name}
                                className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium flex items-center gap-1"
                              >
                                <TableIcon className="w-3 h-3 text-blue-600" />
                                <span>{t.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Obsahuje dashboard */}
                        {tpl.dashboard && (
                          <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Přednastavený dashboard: <strong>{tpl.dashboard.name}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patička s instalací */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <div className="flex text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                        </div>
                        <span className="font-semibold text-slate-700 ml-1">{tpl.downloads}</span>
                        <span>stažení</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInstallTemplate(tpl.id)}
                        disabled={!!installingTemplateId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isInstalling ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Instaluji...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Instalovat šablonu</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODÁL: VYTVOŘIT PRÁZDNOU APLIKACI */}
      {showNewAppModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" /> Vytvořit novou aplikaci
              </h3>
              <button
                onClick={() => setShowNewAppModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmptyApp} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Název aplikace</label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="např. Výroba, Marketing, Logistika..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Popis (volitelně)</label>
                <input
                  type="text"
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="např. Správa výrobních zakázek a kapacit"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={creatingApp}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {creatingApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Vytvořit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
