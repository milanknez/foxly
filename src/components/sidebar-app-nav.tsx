"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Folder,
  Layers,
  Table as TableIcon,
  LayoutDashboard,
  Users,
  LogOut,
  ChevronDown,
  Plus,
  Check,
  X,
  Loader2,
  Receipt,
  Boxes,
  Briefcase,
  FileSpreadsheet,
  MoreVertical,
  Settings,
  Zap,
  Copy,
  Trash2,
  Edit3,
  Palette,
  Code,
  Share2,
  FileText,
  Building2,
  Globe,
  Sparkles,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { TABLE_ICON_MAP, TABLE_ICON_LIST, getTableIcon } from "@/lib/table-icons";
import EditTableModal from "@/components/edit-table-modal";

interface TableItem {
  id: string;
  name: string;
  singularName?: string;
  icon: string;
  sortOrder?: number;
}

interface DashboardItem {
  id: string;
  name: string;
  sortOrder?: number;
}

interface AppItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tables: TableItem[];
  dashboards: DashboardItem[];
}

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  apps: AppItem[];
}

const iconMap = TABLE_ICON_MAP;

export default function SidebarAppNav({
  workspace,
  user,
  userRole,
}: {
  workspace: WorkspaceData;
  user: { name: string; email: string; avatarUrl?: string | null };
  userRole: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, alert } = useDialog();

  // Přečteme z URL aktuální appId a tableId: /[workspaceSlug]/[appId]/[tableId]
  const segments = pathname.split("/").filter(Boolean);
  const isSubdomain = segments[0] !== workspace.slug;
  const offset = isSubdomain ? 0 : 1;
  const routeAppId =
    segments[offset] && segments[offset] !== "users" && segments[offset] !== "settings"
      ? segments[offset]
      : null;
  const routeTableId =
    segments[offset + 1] && segments[offset + 1] !== "dashboard" ? segments[offset + 1] : null;
  const routeDashboardId = segments[offset + 1] === "dashboard" ? segments[offset + 2] : null;

  // Přesná kontrola aktivního stavu pro globální sekce firmy (aby se nerosvěcovaly např. u /app/table/settings)
  const isCompanySettingsActive =
    pathname === `/${workspace.slug}/settings` ||
    pathname === "/settings" ||
    pathname.startsWith(`/${workspace.slug}/settings/`) ||
    pathname.startsWith("/settings/");

  const isCompanyUsersActive =
    pathname === `/${workspace.slug}/users` ||
    pathname === "/users" ||
    pathname.startsWith(`/${workspace.slug}/users/`) ||
    pathname.startsWith("/users/");

  // Vybraná aktivní aplikace dynamicky podle URL, jinak první v pořadí
  const currentApp =
    workspace.apps.find((a) => a.id === routeAppId) ||
    workspace.apps[0] || {
      id: "none",
      name: "Žádná aplikace",
      icon: "Folder",
      color: "#3b82f6",
      tables: [],
      dashboards: [],
    };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [tableMenu, setTableMenu] = useState<{
    id: string;
    name: string;
    singularName?: string;
    icon?: string;
    top: number;
    left: number;
  } | null>(null);
  const [editingTable, setEditingTable] = useState<{
    id: string;
    name: string;
    singularName?: string;
    icon?: string;
  } | null>(null);

  // Formulář pro novou aplikaci
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [creatingApp, setCreatingApp] = useState(false);

  // Formulář pro novou tabulku
  const [newTableName, setNewTableName] = useState("");
  const [newTableSingular, setNewTableSingular] = useState("");
  const [newTableIcon, setNewTableIcon] = useState("Table");
  const [creatingTable, setCreatingTable] = useState(false);

  // Formulář pro nový dashboard
  const [showNewDashboardModal, setShowNewDashboardModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardDesc, setNewDashboardDesc] = useState("");
  const [creatingDashboard, setCreatingDashboard] = useState(false);

  const handleCreateDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardName.trim() || currentApp.id === "none") return;
    setCreatingDashboard(true);
    try {
      const res = await fetch(`/api/apps/${currentApp.id}/dashboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDashboardName.trim(),
          description: newDashboardDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.dashboard) {
        setShowNewDashboardModal(false);
        setNewDashboardName("");
        setNewDashboardDesc("");
        router.push(`/${workspace.slug}/${currentApp.id}/dashboard/${data.dashboard.id}`);
        router.refresh();
      } else {
        await alert(data.error || "Nepodařilo se vytvořit dashboard.");
      }
    } catch (e) {
      console.error(e);
      await alert("Chyba při vytváření dashboardu.");
    } finally {
      setCreatingDashboard(false);
    }
  };

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    const isConfirmed = await confirm({
      title: `Smazat tabulku "${tableName}"?`,
      message: `Opravdu chcete smazat tabulku "${tableName}"? Tato akce smaže všechny její záznamy a je nevratná.`,
      confirmText: "Smazat tabulku",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setTableMenu(null);
    try {
      const res = await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/${workspace.slug}/${currentApp.id}`);
        router.refresh();
      } else {
        await alert("Nepodařilo se smazat tabulku.");
      }
    } catch (e) {
      console.error(e);
      await alert("Chyba při mazání tabulky.");
    }
  };

  // Spolehlivé odhlášení
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // fallback
    }
    window.location.href = "/login";
  };

  const handleSelectApp = (app: AppItem) => {
    setDropdownOpen(false);
    // Pokud má aplikace tabulku, přesměrujeme plynule (SPA) rovnou na ni
    if (app.tables.length > 0) {
      router.push(`/${workspace.slug}/${app.id}/${app.tables[0].id}`);
    } else if (app.dashboards.length > 0) {
      router.push(`/${workspace.slug}/${app.id}/dashboard/${app.dashboards[0].id}`);
    } else {
      router.push(`/${workspace.slug}/${app.id}`);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    setCreatingApp(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAppName, description: newAppDesc }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowNewAppModal(false);
        setNewAppName("");
        setNewAppDesc("");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingApp(false);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim() || currentApp.id === "none") return;
    setCreatingTable(true);
    try {
      const res = await fetch(`/api/apps/${currentApp.id}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTableName, singularName: newTableSingular, icon: newTableIcon }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowNewTableModal(false);
        setNewTableName("");
        setNewTableSingular("");
        setNewTableIcon("Table");
        router.push(`/${workspace.slug}/${currentApp.id}/${data.table.id}`);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingTable(false);
    }
  };

  const AppIconComponent = iconMap[currentApp.icon] || Folder;

  // Sjednocený seznam tabulek a dashboardů seřazený podle sortOrder
  const unifiedItems = [
    ...currentApp.tables.map((t) => ({ ...t, itemType: "table" as const, sortOrder: t.sortOrder ?? 0 })),
    ...currentApp.dashboards.map((d) => ({ ...d, itemType: "dashboard" as const, sortOrder: d.sortOrder ?? 0 })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 no-print select-none">
      {/* 1. Horní akční lišta: Název aplikace a minimalistické tlačítko + */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: currentApp.color || "#3b82f6" }}
          >
            <AppIconComponent className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 truncate" title={currentApp.name}>
            {currentApp.name}
          </span>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
            title="Přidat tabulku nebo dashboard"
            className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>

          {showQuickAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowQuickAddMenu(false)}
              />
              <div className="absolute top-full right-0 mt-1.5 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 text-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddMenu(false);
                    setShowNewTableModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-blue-600 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <TableIcon className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">Nová tabulka</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddMenu(false);
                    setShowNewDashboardModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-emerald-600 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">Nový dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddMenu(false);
                    router.push(`/${workspace.slug}?openTemplates=true`);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors text-left cursor-pointer border-t border-slate-700/60"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold">Šablony aplikací</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. SJEDNOCENÝ SEZNAM POLOŽEK (TABULKY A DASHBOARDY DOHROMADY) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-0.5">
          {unifiedItems.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowQuickAddMenu(true)}
              className="w-full text-left px-2.5 py-2 text-xs text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 cursor-pointer italic border border-dashed border-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Přidat tabulku / dashboard</span>
            </button>
          ) : (
            unifiedItems.map((item) => {
              if (item.itemType === "dashboard") {
                const isActive = item.id === routeDashboardId;

                return (
                  <Link
                    key={`dash-${item.id}`}
                    href={`/${workspace.slug}/${currentApp.id}/dashboard/${item.id}`}
                    prefetch={false}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${isActive
                      ? "bg-emerald-600 text-white font-bold shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }`}
                  >
                    <LayoutDashboard
                      className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-emerald-400"}`}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              }

              // Tabulka
              const isActive = item.id === routeTableId;
              const TIcon = iconMap[item.icon] || TableIcon;

              return (
                <div
                  key={`tbl-${item.id}`}
                  className={`group flex items-center justify-between rounded-lg transition-colors relative ${isActive
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                >
                  <Link
                    href={`/${workspace.slug}/${currentApp.id}/${item.id}`}
                    prefetch={false}
                    className="flex-1 flex items-center gap-2 px-2.5 py-2 text-xs font-medium truncate"
                  >
                    <TIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-blue-400"}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>

                  {/* Nastavení struktury sloupců tabulky (ozubené kolo) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tableMenu?.id === item.id) {
                        setTableMenu(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTableMenu({
                          id: item.id,
                          name: item.name,
                          singularName: item.singularName || item.name,
                          icon: item.icon,
                          top: Math.min(rect.top, window.innerHeight - 360),
                          left: rect.right + 10,
                        });
                      }
                    }}
                    title={`Nastavení a možnosti tabulky ${item.name}`}
                    className={`p-1.5 mr-1 rounded hover:bg-black/20 transition-opacity cursor-pointer ${isActive || tableMenu?.id === item.id
                      ? "opacity-90 hover:opacity-100"
                      : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                      }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Správa, Workflow & Zaměstnanci na stejné úrovni (požadavek uživatele) */}
        <div className="pt-2 border-t border-slate-800 space-y-0.5">
          <Link
            href={`/${workspace.slug}/${currentApp.id}/workflows`}
            prefetch={false}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${pathname.includes("/workflows")
              ? "bg-amber-600 text-white font-bold"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Workflow</span>
          </Link>

          <Link
            href={`/${workspace.slug}/${currentApp.id}/scrapers`}
            prefetch={false}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${pathname.includes("/scrapers")
              ? "bg-cyan-600 text-white font-bold"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Web Scraper</span>
          </Link>

          <Link
            href={`/${workspace.slug}/users`}
            prefetch={false}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${isCompanyUsersActive
              ? "bg-purple-600 text-white font-bold"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Zaměstnanci & Práva</span>
          </Link>

          <Link
            href={`/${workspace.slug}/settings`}
            prefetch={false}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${isCompanySettingsActive
              ? "bg-blue-600 text-white font-bold"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Nastavení firmy & Pluginy</span>
          </Link>
        </div>
      </div>

      {/* 4. Patička s profilem a spolehlivým odhlášením */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden ring-1 ring-slate-700">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.substring(0, 1).toUpperCase()
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-white truncate leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          title="Odhlásit se"
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Modál: Vytvořit novou aplikaci */}
      {showNewAppModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-blue-600" /> Nová Aplikace
              </h3>
              <button onClick={() => setShowNewAppModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateApp} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Název aplikace</label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="např. Výroba a Servis"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Popis</label>
                <input
                  type="text"
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="Stručný popis účelu"
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
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Vytvořit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modál: Vytvořit novou tabulku */}
      {showNewTableModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-blue-600" /> Přidat novou tabulku do {currentApp.name}
              </h3>
              <button onClick={() => setShowNewTableModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Název tabulky (množné číslo)</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="např. Vozidla, Dodavatelé..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Jednotné číslo</label>
                <input
                  type="text"
                  value={newTableSingular}
                  onChange={(e) => setNewTableSingular(e.target.value)}
                  placeholder="např. Vozidlo"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Ikona tabulky</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TABLE_ICON_LIST.slice(0, 12).map((item) => {
                    const IIcon = item.icon;
                    const isSel = newTableIcon === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setNewTableIcon(item.key)}
                        title={item.label}
                        className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${isSel
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                      >
                        <IIcon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewTableModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={creatingTable}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingTable ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Vytvořit tabulku"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modál: Vytvořit nový dashboard */}
      {showNewDashboardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4 text-emerald-600" /> Nový dashboard v {currentApp.name}
              </h3>
              <button onClick={() => setShowNewDashboardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDashboard} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Název dashboardu</label>
                <input
                  type="text"
                  required
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="např. Finanční přehled, KPI firmy..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Popis (volitelně)</label>
                <input
                  type="text"
                  value={newDashboardDesc}
                  onChange={(e) => setNewDashboardDesc(e.target.value)}
                  placeholder="např. Denní součty, TOP zakázky a stav poptávek"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewDashboardModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={creatingDashboard}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {creatingDashboard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Vytvořit dashboard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Plovoucí kontextové menu nastavení tabulky s pevnou pozicí (nikdy se neschová za overflow) */}
      {tableMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/10"
            onClick={(e) => {
              e.stopPropagation();
              setTableMenu(null);
            }}
          />
          <div
            style={{
              position: "fixed",
              top: `${tableMenu.top}px`,
              left: `${tableMenu.left}px`,
            }}
            className="w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs animate-in fade-in zoom-in-95 font-sans select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-100 font-bold text-slate-900 truncate flex items-center justify-between">
              <span className="truncate">{tableMenu.name}</span>
              <button
                type="button"
                onClick={() => setTableMenu(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-1">
              <Link
                href={`/${workspace.slug}/${currentApp.id}/${tableMenu.id}/settings`}
                prefetch={false}
                onClick={() => setTableMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Položky tabulky (sloupce)</span>
              </Link>

              <button
                type="button"
                onClick={async () => {
                  setTableMenu(null);
                  await alert("Duplikace tabulky byla zařazena do fronty.");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 text-slate-500" />
                <span className="font-medium">Kopírovat tabulku</span>
              </button>

              <Link
                href={`/${workspace.slug}/${currentApp.id}/${tableMenu.id}?openFormattingModal=true`}
                prefetch={false}
                onClick={() => setTableMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Palette className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Podmíněné formátování</span>
              </Link>

              <Link
                href={`/${workspace.slug}/${currentApp.id}/${tableMenu.id}/settings#scripts`}
                prefetch={false}
                onClick={() => setTableMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Code className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">Skriptování</span>
              </Link>

              <Link
                href={`/${workspace.slug}/${currentApp.id}/${tableMenu.id}?openShareModal=true`}
                prefetch={false}
                onClick={() => setTableMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Zveřejnit formulář</span>
              </Link>
            </div>

            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeleteTable(tableMenu.id, tableMenu.name)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-semibold cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Smazat tabulku</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modál pro editaci názvu a ikony tabulky */}
      {editingTable && (
        <EditTableModal
          isOpen={!!editingTable}
          onClose={() => setEditingTable(null)}
          table={editingTable}
        />
      )}
    </aside>
  );
}
