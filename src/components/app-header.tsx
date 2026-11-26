"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FoxIcon } from "./foxly-logo";
import {
  Terminal,
  ChevronDown,
  Bell,
  Grid,
  LogOut,
  Users,
  Shield,
  Layers,
  Check,
  Plus,
  HelpCircle,
  FileSpreadsheet,
  ScanText,
  SlidersHorizontal,
  X,
  Building2,
  Puzzle,
  Download,
  User,
  Key,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import UserProfileModal from "@/components/user-profile-modal";
import HelpCenterModal from "@/components/help-center-modal";

interface AppTableItem {
  id: string;
  name: string;
}

interface WorkspaceApp {
  id: string;
  name: string;
  color?: string;
  tables: AppTableItem[];
}

interface AppHeaderProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    apps: WorkspaceApp[];
  };
  user: { name: string; email: string; avatarUrl?: string | null };
  userRole: string;
}

export default function AppHeader({
  workspace,
  user,
  userRole,
}: AppHeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const routeAppId = segments[1] && segments[1] !== "users" ? segments[1] : null;
  const routeTableId = segments[2] && segments[2] !== "dashboard" ? segments[2] : null;

  const currentApp =
    workspace.apps.find((a) => a.id === routeAppId) || workspace.apps[0];
  const currentTable =
    currentApp?.tables.find((t) => t.id === routeTableId) ||
    currentApp?.tables[0];

  const router = useRouter();
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [userName, setUserName] = useState(user.name);
  const [userAvatar, setUserAvatar] = useState(user.avatarUrl || "");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Spolehlivé odhlášení
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    window.location.href = "/login";
  };

  // Přepnutí aplikace
  const handleSwitchApp = (app: WorkspaceApp) => {
    setIsAppSwitcherOpen(false);
    if (app.tables.length > 0) {
      router.push(`/${workspace.slug}/${app.id}/${app.tables[0].id}`);
    } else {
      router.push(`/${workspace.slug}/${app.id}`);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 select-none relative">
      {/* Levá část: Brand Logo (nebo vlastní logo firmy) a purple app/table badge */}
      <div className="flex items-center gap-3">
        {/* Brand Logo Foxly nebo Vlastní logo firmy */}
        <Link
          href={`/${workspace.slug}`}
          prefetch={false}
          className="flex items-center gap-2 font-black text-xl tracking-tighter text-slate-900 group shrink-0"
        >
          {workspace.logoUrl ? (
            <img
              src={workspace.logoUrl}
              alt={workspace.name}
              className="h-8 max-w-[160px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                <FoxIcon className="w-5 h-5" />
              </div>
              <span className="truncate max-w-[200px]">{workspace.name || "Foxly"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mb-2 ml-0.5 shrink-0" />
            </div>
          )}
        </Link>

        {/* Purple terminal App & Table Breadcrumb pill s vyšším paddingem (požadavek uživatele) */}
        {currentApp && (
          <div className="relative ml-2">
            <button
              type="button"
              onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)}
              className="flex items-center gap-2 bg-[#8b31d0] hover:bg-[#7a28b9] text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-md"
              title="Klikněte pro přepnutí aplikace"
            >
              <Terminal className="w-4 h-4 text-white/90 stroke-[2.5]" />
              <span className="font-bold tracking-tight">{currentApp.name}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/80 transition-transform ${
                  isAppSwitcherOpen ? "rotate-180" : ""
                }`}
              />
              {currentTable && (
                <>
                  <span className="text-white/30 font-light mx-0.5">|</span>
                  <span className="text-white/95 font-medium">{currentTable.name}</span>
                </>
              )}
            </button>

            {/* Dropdown vysouvací nabídka se všemi aplikacemi v hlavičce */}
            {isAppSwitcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsAppSwitcherOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Přepnout aplikaci ({workspace.apps.length})
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {workspace.apps.map((app) => {
                      const isSelected = app.id === currentApp.id;

                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => handleSwitchApp(app)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors text-left cursor-pointer ${
                            isSelected
                              ? "bg-purple-50 text-purple-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 text-[10px] font-bold shadow-2xs"
                              style={{ backgroundColor: app.color || "#8b31d0" }}
                            >
                              <Layers className="w-3 h-3" />
                            </div>
                            <div className="truncate">
                              <div className="truncate font-medium">{app.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {app.tables.length === 1
                                  ? "1 tabulka"
                                  : `${app.tables.length} tabulek`}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-purple-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Všechny aplikace přehled */}
                  <div className="p-1.5 border-t border-slate-100 bg-slate-50">
                    <Link
                      href={`/${workspace.slug}`}
                      prefetch={false}
                      onClick={() => setIsAppSwitcherOpen(false)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-slate-600 hover:text-slate-900 text-[11px] font-semibold transition-colors"
                    >
                      <Layers className="w-3 h-3" /> Zobrazit všechny aplikace na ploše
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pravá část: + Pozvat, Centrum nápovědy, zvonek, avatar, 9-dots */}
      <div className="flex items-center gap-3 text-xs">
        <Link
          href={`/${workspace.slug}/users`}
          prefetch={false}
          className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-semibold px-2 py-1 rounded hover:bg-slate-50 transition-colors"
        >
          <span className="text-blue-600 font-bold text-sm">+</span>
          <span>Pozvat</span>
        </Link>

        {/* Centrum nápovědy tlačítko */}
        <button
          type="button"
          onClick={() => setIsHelpModalOpen(true)}
          className="text-slate-600 hover:text-slate-900 font-medium hidden sm:inline-block cursor-pointer"
        >
          Centrum nápovědy
        </button>

        {/* Notifikace Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Notifikace a systémové události"
            className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {isNotificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotificationsOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 text-xs">
                <div className="font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>Systémové notifikace</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                    Vše v pořádku
                  </span>
                </div>
                <div className="py-3 text-slate-500 text-center text-[11px] leading-relaxed">
                  Žádné nevyřízené upozornění. Všechny datové procesy, importy i výpočty proběhly úspěšně.
                </div>
              </div>
            </>
          )}
        </div>

        {/* User avatar & Rozbalovací menu s profilem a odhlášením */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title={`${userName} (${user.email}) - Klikněte pro profil a odhlášení`}
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-slate-200 hover:ring-blue-500 shadow-xs cursor-pointer transition-all bg-white"
          >
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4 text-slate-200" />
              </div>
            )}
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                {/* Informace o uživateli */}
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 truncate">{userName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                  <div className="mt-1.5">
                    <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded">
                      {userRole === "SUPERADMIN"
                        ? "Systémový administrátor"
                        : userRole === "ADMIN" || userRole === "OWNER"
                        ? "Administrátor firmy"
                        : "Člen týmu"}
                    </span>
                  </div>
                </div>

                {/* Položky menu */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-blue-700 font-semibold bg-blue-50/70 hover:bg-blue-100 transition-colors text-left cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Můj profil a heslo</span>
                  </button>

                  <Link
                    href={`/${workspace.slug}/settings`}
                    prefetch={false}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nastavení firmy a logo</span>
                  </Link>

                  <Link
                    href={`/${workspace.slug}/settings`}
                    prefetch={false}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Puzzle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pluginy a rozšíření</span>
                  </Link>

                  <Link
                    href={`/${workspace.slug}/users`}
                    prefetch={false}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Zaměstnanci a oprávnění</span>
                  </Link>

                  <Link
                    href={`/${workspace.slug}`}
                    prefetch={false}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Plocha všech aplikací</span>
                  </Link>
                </div>

                {/* Tlačítko Odhlásit se */}
                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-semibold transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Odhlásit se</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODÁL: CENTRUM NÁPOVĚDY A PRŮVODCE SYSTÉMEM */}
      <HelpCenterModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        workspaceSlug={workspace.slug}
      />

      {/* MODÁL: MŮJ PROFIL & ZMĚNA HESLA */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={{
            name: userName,
            email: user.email,
            avatarUrl: userAvatar,
          }}
          userRole={userRole}
          onProfileUpdated={(updated) => {
            setUserName(updated.name);
            setUserAvatar(updated.avatarUrl || "");
          }}
        />
      )}
    </header>
  );
}
