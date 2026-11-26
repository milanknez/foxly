"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useDialog } from "@/components/ui/dialog-provider";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  Mail,
  Key,
  Check,
  Loader2,
  X,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Trash2,
  Lock,
  Database,
  Folder,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isSystemAdmin?: boolean;
}

interface TablePerm {
  id?: string;
  tableId: string;
  permissionLevel: "FULL_ACCESS" | "READ_WRITE" | "OWN_RECORDS" | "READ_ONLY" | "NO_ACCESS";
}

interface Member {
  id: string;
  userId: string;
  role: string;
  jobTitle: string | null;
  allowedAppIds: string[];
  createdAt: string;
  user: UserInfo;
  tablePermissions: TablePerm[];
}

interface TableMeta {
  id: string;
  name: string;
  singularName: string;
  icon: string;
  appId: string;
}

interface AppMeta {
  id: string;
  name: string;
  color: string;
  icon: string;
  tables: TableMeta[];
}

const PERMISSION_LEVELS = [
  {
    key: "FULL_ACCESS",
    label: "Plný přístup",
    description: "Čtení, vytváření, úpravy a mazání záznamů",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-600 text-white",
    icon: ShieldCheck,
  },
  {
    key: "READ_WRITE",
    label: "Čtení a zápis",
    description: "Čtení, zakládání a editace záznamů (bez mazání)",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-600 text-white",
    icon: Edit3,
  },
  {
    key: "OWN_RECORDS",
    label: "Pouze vlastní záznamy",
    description: "Vidí a upravuje pouze záznamy, které sám vytvořil",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-500 text-white",
    icon: Lock,
  },
  {
    key: "READ_ONLY",
    label: "Pouze čtení",
    description: "Pouze prohlížení dat bez možnosti změn",
    color: "bg-slate-50 text-slate-700 border-slate-200",
    badge: "bg-slate-500 text-white",
    icon: Eye,
  },
  {
    key: "NO_ACCESS",
    label: "Bez přístupu",
    description: "Tabulka je zcela skrytá a nepřístupná",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    badge: "bg-rose-600 text-white",
    icon: ShieldAlert,
  },
] as const;

export default function WorkspaceUsersPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const { confirm } = useDialog();

  const [members, setMembers] = useState<Member[]>([]);
  const [apps, setApps] = useState<AppMeta[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("MEMBER");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modální okno: Přidání zaměstnance
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("MEMBER");
  const [addJobTitle, setAddJobTitle] = useState("");
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  // Modální okno: Editace základních údajů a hesla
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editRole, setEditRole] = useState("MEMBER");
  const [editPassword, setEditPassword] = useState("");
  const [editingSubmitting, setEditingSubmitting] = useState(false);

  // Modální okno: Matice oprávnění (Permissions Matrix)
  const [permMember, setPermMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [restrictApps, setRestrictApps] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [tablePermsMap, setTablePermsMap] = useState<Record<string, string>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Zprávy
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsersAndApps = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceSlug}/users`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setApps(data.apps || []);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
        if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
      }
    } catch (e) {
      console.error("Fetch members error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndApps();
  }, [workspaceSlug]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // 1. Založení nového zaměstnance
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          password: addPassword,
          role: addRole,
          jobTitle: addJobTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chyba při zakládání zaměstnance");
      }

      showNotification(`Zaměstnanec ${addName} byl úspěšně vytvořen!`);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddJobTitle("");
      setAddRole("MEMBER");
      setShowAddModal(false);
      fetchUsersAndApps();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Chyba", true);
    } finally {
      setAddingSubmitting(false);
    }
  };

  // 2. Otevření modálu editace profilu
  const handleOpenEditModal = (m: Member) => {
    setEditMember(m);
    setEditName(m.user.name);
    setEditJobTitle(m.jobTitle || "");
    setEditRole(m.role);
    setEditPassword("");
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setEditingSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        name: editName,
        jobTitle: editJobTitle,
        role: editRole,
      };
      if (editPassword.trim()) {
        body.password = editPassword;
      }

      const res = await fetch(`/api/workspaces/${workspaceSlug}/users/${editMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chyba při aktualizaci zaměstnance");
      }

      showNotification(`Profil zaměstnance ${editName} byl aktualizován.`);
      setEditMember(null);
      fetchUsersAndApps();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Chyba", true);
    } finally {
      setEditingSubmitting(false);
    }
  };

  // 3. Otevření modálu oprávnění (Permissions Matrix)
  const handleOpenPermissionsModal = (m: Member) => {
    setPermMember(m);
    setSelectedRole(m.role);
    const hasRestrictedApps = Array.isArray(m.allowedAppIds) && m.allowedAppIds.length > 0;
    setRestrictApps(hasRestrictedApps);
    setSelectedAppIds(hasRestrictedApps ? [...m.allowedAppIds] : apps.map((a) => a.id));

    // Vyplnění mapy oprávnění pro tabulky
    const map: Record<string, string> = {};
    apps.forEach((app) => {
      app.tables.forEach((table) => {
        const existing = m.tablePermissions?.find((tp) => tp.tableId === table.id);
        if (existing) {
          map[table.id] = existing.permissionLevel;
        } else {
          // Výchozí dle role
          map[table.id] = m.role === "VIEWER" ? "READ_ONLY" : "FULL_ACCESS";
        }
      });
    });
    setTablePermsMap(map);
  };

  // Hromadné nastavení úrovně pro všechny tabulky
  const handleBulkSetTablePerms = (level: string) => {
    const updated = { ...tablePermsMap };
    Object.keys(updated).forEach((tId) => {
      updated[tId] = level;
    });
    setTablePermsMap(updated);
  };

  // Uložení oprávnění zaměstnance
  const handleSavePermissions = async () => {
    if (!permMember) return;
    setSavingPerms(true);

    try {
      const formattedTablePerms = Object.entries(tablePermsMap).map(([tableId, permissionLevel]) => ({
        tableId,
        permissionLevel,
      }));

      const res = await fetch(`/api/workspaces/${workspaceSlug}/users/${permMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          allowedAppIds: restrictApps ? selectedAppIds : [],
          tablePermissions: formattedTablePerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chyba při ukládání oprávnění");
      }

      showNotification(`Oprávnění pro ${permMember.user.name} byla úspěšně uložena!`);
      setPermMember(null);
      fetchUsersAndApps();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Chyba", true);
    } finally {
      setSavingPerms(false);
    }
  };

  // 4. Odebrání zaměstnance z firmy
  const handleDeleteMember = async (m: Member) => {
    const isConfirmed = await confirm({
      title: `Odebrat zaměstnance?`,
      message: `Opravdu chcete odebrat zaměstnance ${m.user.name} (${m.user.email}) z firmy? Ztratí přístup ke všem aplikacím a datům firmy.`,
      confirmText: "Odebrat zaměstnance",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/users/${m.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chyba při odebírání zaměstnance");
      }

      showNotification(`Zaměstnanec ${m.user.name} byl odebrán z firmy.`);
      fetchUsersAndApps();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Chyba", true);
    }
  };

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.user.name.toLowerCase().includes(query) ||
      m.user.email.toLowerCase().includes(query) ||
      (m.jobTitle && m.jobTitle.toLowerCase().includes(query)) ||
      m.role.toLowerCase().includes(query)
    );
  });

  const isCurrentUserAdmin = currentUserRole === "SUPERADMIN" || currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* 1. HLAVIČKA A AKCE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Správa Zaměstnanců & Práv
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurujte firemní role, přístup k aplikacím a granulární oprávnění pro jednotlivé tabulky per uživatel.
              </p>
            </div>
          </div>
        </div>

        {isCurrentUserAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:shadow-md active:scale-95"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" /> Přidat nového zaměstnance
          </button>
        )}
      </div>

      {/* NOTIFIKACE */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* 2. STATISTICKÉ KARTY */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{members.length}</div>
            <div className="text-[11px] font-medium text-slate-500">Aktivních zaměstnanců</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">
              {members.filter((m) => m.role === "OWNER" || m.role === "ADMIN").length}
            </div>
            <div className="text-[11px] font-medium text-slate-500">Správců & Vlastníků</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{apps.length}</div>
            <div className="text-[11px] font-medium text-slate-500">Firemních aplikací</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">
              {apps.reduce((sum, a) => sum + a.tables.length, 0)}
            </div>
            <div className="text-[11px] font-medium text-slate-500">Celkem tabulek s právy</div>
          </div>
        </div>
      </div>

      {/* 3. VYHLEDÁVÁNÍ */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat zaměstnance podle jména, e-mailu nebo pozice..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Zobrazeno {filteredMembers.length} z {members.length}
        </div>
      </div>

      {/* 4. TABULKA ZAMĚSTNANCŮ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Zaměstnanec</th>
              <th className="py-3 px-4">Pracovní pozice</th>
              <th className="py-3 px-4">Role v systému</th>
              <th className="py-3 px-4">Přístup k aplikacím</th>
              <th className="py-3 px-4">Práva na tabulky</th>
              <th className="py-3 px-4 text-right">Akce & Nastavení</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                  Načítání seznamu zaměstnanců a firemních oprávnění...
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Žádný zaměstnanec neodpovídá vyhledávání.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const isRestrictedApps = Array.isArray(m.allowedAppIds) && m.allowedAppIds.length > 0;
                const customTablePermsCount = m.tablePermissions?.length || 0;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Jméno a email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                          {m.user.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {m.user.name}
                            {m.userId === currentUserId && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-normal">
                                Vy
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {m.user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Pracovní pozice */}
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {m.jobTitle || "Bez pozice"}
                      </span>
                    </td>

                    {/* Role v systému */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          m.role === "OWNER"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : m.role === "ADMIN"
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : m.role === "VIEWER"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-blue-100 text-blue-900 border border-blue-200"
                        }`}
                      >
                        {m.role === "OWNER"
                          ? "Vlastník (Owner)"
                          : m.role === "ADMIN"
                          ? "Správce (Admin)"
                          : m.role === "VIEWER"
                          ? "Čtenář (Viewer)"
                          : "Zaměstnanec (Member)"}
                      </span>
                    </td>

                    {/* Přístup k aplikacím */}
                    <td className="py-3 px-4">
                      {m.role === "OWNER" || m.role === "ADMIN" ? (
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Všechny aplikace (Plná práva)
                        </span>
                      ) : isRestrictedApps ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          <Sliders className="w-3 h-3 text-amber-600" />
                          {m.allowedAppIds.length} z {apps.length} aplikací
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                          Všechny aplikace ({apps.length})
                        </span>
                      )}
                    </td>

                    {/* Práva na tabulky */}
                    <td className="py-3 px-4">
                      {m.role === "OWNER" || m.role === "ADMIN" ? (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          Neomezený přístup
                        </span>
                      ) : customTablePermsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          {customTablePermsCount} vlastních pravidel
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          Výchozí ({m.role === "VIEWER" ? "Pouze čtení" : "Plný přístup"})
                        </span>
                      )}
                    </td>

                    {/* Akce */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tlačítko Nastavit práva per uživatel */}
                        <button
                          type="button"
                          onClick={() => handleOpenPermissionsModal(m)}
                          disabled={!isCurrentUserAdmin}
                          title="Detailní matice oprávnění pro aplikace a tabulky"
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Oprávnění</span>
                        </button>

                        {/* Upravit profil a heslo */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(m)}
                          disabled={!isCurrentUserAdmin}
                          title="Upravit profil, jméno nebo vygenerovat heslo"
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Odebrat z firmy */}
                        {isCurrentUserAdmin && m.userId !== currentUserId && m.role !== "OWNER" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(m)}
                            title="Odebrat zaměstnance z firmy"
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. MODÁL: MATICE OPRÁVNĚNÍ PER UŽIVATEL (PERMISSIONS MATRIX) */}
      {permMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Hlavička modálu */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Nastavení oprávnění: <span className="text-purple-600">{permMember.user.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {permMember.user.email} • {permMember.jobTitle || "Bez pozice"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermMember(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Obsah modálu - scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Sekce 1: Firemní role */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  1. Globální role v systému
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setSelectedRole("ADMIN")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRole === "ADMIN"
                        ? "border-purple-600 bg-purple-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Správce (ADMIN)</span>
                      {selectedRole === "ADMIN" && <Check className="w-4 h-4 text-purple-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Plný přístup ke všem aplikacím, tabulkám, nastavení firmy i zaměstnancům.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedRole("MEMBER")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRole === "MEMBER"
                        ? "border-blue-600 bg-blue-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Zaměstnanec (MEMBER)</span>
                      {selectedRole === "MEMBER" && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Standardní uživatel s přístupem pouze k povoleným aplikacím a tabulkám.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedRole("VIEWER")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRole === "VIEWER"
                        ? "border-amber-600 bg-amber-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Čtenář (VIEWER)</span>
                      {selectedRole === "VIEWER" && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pouze pasivní čtení dat bez oprávnění cokoliv vytvářet, upravovat nebo mazat.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sekce 2: Omezení aplikací */}
              {selectedRole !== "ADMIN" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        2. Přístup k firemním aplikacím
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Určete, které aplikace zaměstnanec uvidí ve svém postranním panelu a hlavičce.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRestrictApps(false);
                          setSelectedAppIds(apps.map((a) => a.id));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          !restrictApps
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Všechny aplikace
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestrictApps(true)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          restrictApps
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Pouze vybrané
                      </button>
                    </div>
                  </div>

                  {restrictApps && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {apps.map((app) => {
                        const isChecked = selectedAppIds.includes(app.id);
                        return (
                          <label
                            key={app.id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
                              isChecked
                                ? "bg-white border-purple-300 text-slate-900 font-bold shadow-xs"
                                : "bg-transparent border-slate-200 text-slate-500 hover:bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAppIds([...selectedAppIds, app.id]);
                                } else {
                                  setSelectedAppIds(selectedAppIds.filter((id) => id !== app.id));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="truncate">{app.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sekce 3: Detailní matice oprávnění pro jednotlivé tabulky */}
              {selectedRole !== "ADMIN" && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        3. Granulární práva per tabulka
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Nastavte úroveň přístupu (Plný přístup, Čtení & zápis, Pouze vlastní záznamy, Pouze čtení, Bez přístupu).
                      </p>
                    </div>

                    {/* Hromadné akce */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Vše nastavit:</span>
                      <button
                        type="button"
                        onClick={() => handleBulkSetTablePerms("FULL_ACCESS")}
                        className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition-colors"
                      >
                        Plný přístup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSetTablePerms("READ_WRITE")}
                        className="px-2 py-0.5 rounded text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold transition-colors"
                      >
                        Čtení i zápis
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSetTablePerms("OWN_RECORDS")}
                        className="px-2 py-0.5 rounded text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold transition-colors"
                      >
                        Vlastní záznamy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSetTablePerms("READ_ONLY")}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
                      >
                        Pouze čtení
                      </button>
                    </div>
                  </div>

                  {/* Seznam tabulek seskupených podle aplikací */}
                  <div className="space-y-4">
                    {apps.map((app) => {
                      const isAppDisabled = restrictApps && !selectedAppIds.includes(app.id);

                      return (
                        <div
                          key={app.id}
                          className={`rounded-xl border border-slate-200 overflow-hidden ${
                            isAppDisabled ? "opacity-40 bg-slate-50 pointer-events-none" : "bg-white"
                          }`}
                        >
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <Folder className="w-4 h-4 text-purple-600" /> {app.name}
                            </span>
                            {isAppDisabled && (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Aplikace není tomuto uživateli povolena
                              </span>
                            )}
                          </div>

                          <div className="divide-y divide-slate-100">
                            {app.tables.map((table) => {
                              const currentLevel = tablePermsMap[table.id] || "FULL_ACCESS";

                              return (
                                <div
                                  key={table.id}
                                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                      <FileSpreadsheet className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900">{table.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        ID: {table.id.substring(0, 8)}...
                                      </div>
                                    </div>
                                  </div>

                                  {/* Výběr oprávnění pro tuto tabulku */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {PERMISSION_LEVELS.map((lvl) => {
                                      const isSelected = currentLevel === lvl.key;
                                      const IconComp = lvl.icon;

                                      return (
                                        <button
                                          key={lvl.key}
                                          type="button"
                                          onClick={() =>
                                            setTablePermsMap({ ...tablePermsMap, [table.id]: lvl.key })
                                          }
                                          title={lvl.description}
                                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isSelected
                                              ? `${lvl.badge} shadow-xs border-transparent`
                                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                          }`}
                                        >
                                          <IconComp className="w-3 h-3" />
                                          <span>{lvl.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Patička modálu */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setPermMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPerms}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingPerms && <Loader2 className="w-4 h-4 animate-spin" />}
                Uložit oprávnění zaměstnance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODÁL: UPRAVIT PROFIL & HESLO */}
      {editMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" /> Upravit zaměstnance: {editMember.user.name}
              </h3>
              <button
                onClick={() => setEditMember(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celé jméno zaměstnance
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail (nelze měnit)
                </label>
                <input
                  type="email"
                  disabled
                  value={editMember.user.email}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pracovní pozice
                  </label>
                  <input
                    type="text"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    placeholder="např. Účetní"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role v systému
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="MEMBER">Zaměstnanec (MEMBER)</option>
                    <option value="ADMIN">Správce (ADMIN)</option>
                    <option value="VIEWER">Čtenář (VIEWER)</option>
                    {editMember.role === "OWNER" && <option value="OWNER">Vlastník (OWNER)</option>}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  Nové heslo (ponechte prázdné pro beze změny)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Zadejte nové heslo pokud chcete resetovat..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={editingSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editingSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Uložit změny
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODÁL: PŘIDAT NOVÉHO ZAMĚSTNANCE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" /> Přidat nového zaměstnance do firmy
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celé jméno a příjmení
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="např. Jiří Kovář"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firemní e-mail (přihlašovací jméno)
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="jiri.kovar@firma.cz"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> Dočasné heslo pro první přihlášení
                </label>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="např. heslo123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pracovní pozice
                  </label>
                  <input
                    type="text"
                    value={addJobTitle}
                    onChange={(e) => setAddJobTitle(e.target.value)}
                    placeholder="např. Skladník"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role v systému
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="MEMBER">Běžný zaměstnanec (MEMBER)</option>
                    <option value="ADMIN">Správce (ADMIN)</option>
                    <option value="VIEWER">Čtenář (VIEWER)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={addingSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {addingSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Vytvořit účet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
