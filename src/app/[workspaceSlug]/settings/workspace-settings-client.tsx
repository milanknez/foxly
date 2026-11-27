"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Puzzle,
  Download,
  Save,
  Check,
  Loader2,
  ArrowLeft,
  Upload,
  Globe,
  Mail,
  Phone,
  FileSpreadsheet,
  Zap,
  Code,
  Layers,
  Sparkles,
  FileArchive,
  Eye,
  CheckCircle2,
  User,
  Key,
  Lock,
  RotateCcw,
  AlertCircle,
  Shield,
  Dices,
  Copy,
  Trash2,
  Terminal,
  Plus,
  Send,
  HardDrive,
} from "lucide-react";
import { ANIMATED_AVATAR_PRESETS, getRandomAnimatedAvatar } from "@/lib/avatars";
import { useDialog } from "@/components/ui/dialog-provider";
import type { WorkspaceStorageStats } from "@/lib/storage";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  companyDetails?: Record<string, any>;
  plugins?: string[];
  apps: {
    id: string;
    name: string;
    tables: {
      id: string;
      name: string;
      _count: { records: number; columns: number };
    }[];
  }[];
}

const AVAILABLE_PLUGINS = [
  {
    id: "backup_zip",
    name: "Kompletní zálohování (ZIP)",
    desc: "Umožňuje jedním kliknutím exportovat kompletní data všech aplikací a tabulek do komprimovaného ZIP archivu (obsahuje Excel .xlsx a JSON).",
    icon: FileArchive,
    category: "Data & Bezpečnost",
    color: "#2563eb",
  },
  {
    id: "custom_scripting",
    name: "Vlastní skriptování (JS Engine)",
    desc: "Aktivuje možnost psát a spouštět vlastní JavaScript kód pro pokročilé výpočty, validační pravidla a podmíněnou logiku u tabulek.",
    icon: Code,
    category: "Vývoj & Automatizace",
    color: "#7c3aed",
  },
  {
    id: "custom_buttons",
    name: "Vlastní akční tlačítka v tabulkách",
    desc: "Umožňuje přidávat vlastní barevná tlačítka do nástrojové lišty nad tabulkou, která na kliknutí spouští workflow nebo skripty.",
    icon: Zap,
    category: "Workflow",
    color: "#d97706",
  },
  {
    id: "ai_ocr",
    name: "AI OCR Vytěžování faktur",
    desc: "Automatické rozpoznávání textu a údajů z přijatých faktur (PDF, JPG, PNG) a okamžité naplnění do sloupců tabulky.",
    icon: Sparkles,
    category: "Umělá inteligence",
    color: "#059669",
  },
  {
    id: "webhooks_api",
    name: "Webhooky & REST API Integrace",
    desc: "Odesílání webhook notifikací do Make, Zapier, Slack nebo vlastního API při vytvoření, změně či smazání záznamu.",
    icon: Globe,
    category: "Integrace",
    color: "#0891b2",
  },
  {
    id: "audit_log",
    name: "Auditní stopa a historie změn",
    desc: "Podrobné zaznamenávání každé úpravy buňky, autora změn a časového razítka s možností zobrazení v detailu záznamu.",
    icon: CheckCircle2,
    category: "Data & Bezpečnost",
    color: "#475569",
  },
];



export default function WorkspaceSettingsClient({
  workspace,
  userRole,
  currentUser,
  storageUsage,
}: {
  workspace: WorkspaceData;
  userRole: string;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  storageUsage?: WorkspaceStorageStats | null;
}) {
  const router = useRouter();
  const { alert, confirm } = useDialog();
  const [activeTab, setActiveTab] = useState<"company" | "plugins" | "backup" | "profile" | "smtp" | "api">("company");
  const [storage, setStorage] = useState<WorkspaceStorageStats | null>(storageUsage || null);

  // API & AI Integrace
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string;
    name: string;
    maskedKey?: string;
    keyPrefix?: string;
    permissions?: string[];
    expiresAt: string | null;
    createdAt: string;
    lastUsedAt?: string | null;
  }>>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiration, setNewKeyExpiration] = useState<"never" | "30" | "90" | "365">("never");
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Načtení API klíčů
  const fetchApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (err) {
      console.error("Chyba při načítání API klíčů:", err);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "api") {
      fetchApiKeys();
    }
  }, [activeTab]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays: newKeyExpiration === "never" ? null : parseInt(newKeyExpiration, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        await alert(data.error || "Nepodařilo se vytvořit API klíč");
        return;
      }

      const generatedToken = data.token || data.rawKey;
      setNewlyCreatedToken(generatedToken);
      if (data.apiKey) {
        setApiKeys((prev) => [data.apiKey, ...prev.filter((k) => k.id !== data.apiKey.id)]);
      }
      setNewKeyName("");
      setIsCreatingKey(false);
      fetchApiKeys();
    } catch (err) {
      console.error("Chyba při vytváření API klíče:", err);
      await alert("Nastala chyba při vytváření API klíče.");
    }
  };

  const handleRevokeApiKey = async (keyId: string, keyName: string) => {
    const isConfirmed = await confirm(`Opravdu chcete odvolat API klíč "${keyName}"? Externí aplikace a AI agenti používající tento klíč okamžitě ztratí přístup.`);
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
        await alert("API klíč byl úspěšně odvolán.");
      } else {
        const data = await res.json();
        await alert(data.error || "Nepodařilo se odvolat API klíč.");
      }
    } catch (err) {
      console.error("Chyba při odvolávání API klíče:", err);
      await alert("Nastala chyba při komunikaci se serverem.");
    }
  };

  // Firemní údaje
  const [companyName, setCompanyName] = useState(workspace.name || "");
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(workspace.primaryColor || "#3b82f6");

  const initialDetails = (workspace.companyDetails || {}) as Record<string, string>;
  const [ico, setIco] = useState(initialDetails.ico || "");
  const [dic, setDic] = useState(initialDetails.dic || "");
  const [street, setStreet] = useState(initialDetails.street || "");
  const [city, setCity] = useState(initialDetails.city || "");
  const [zipCode, setZipCode] = useState(initialDetails.zipCode || "");
  const [email, setEmail] = useState(initialDetails.email || "");
  const [phone, setPhone] = useState(initialDetails.phone || "");
  const [web, setWeb] = useState(initialDetails.web || "");

  // SMTP Nastavení pro automatizace
  const initialSmtp = (initialDetails.smtp || {}) as Record<string, any>;
  const [smtpHost, setSmtpHost] = useState<string>(initialSmtp.host || "");
  const [smtpPort, setSmtpPort] = useState<string | number>(initialSmtp.port || 587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(initialSmtp.secure || false);
  const [smtpUser, setSmtpUser] = useState<string>(initialSmtp.user || "");
  const [smtpPass, setSmtpPass] = useState<string>(initialSmtp.pass || "");
  const [smtpFromEmail, setSmtpFromEmail] = useState<string>(initialSmtp.fromEmail || "");
  const [smtpFromName, setSmtpFromName] = useState<string>(initialSmtp.fromName || "");
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>("");
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);

  // Můj profil & Zabezpečení
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatarUrl || "");
  const [avatarCategory, setAvatarCategory] = useState<string>("all");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Aktivní pluginy
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(
    Array.isArray(workspace.plugins) ? workspace.plugins : ["backup_zip", "custom_scripting", "custom_buttons", "ai_ocr"]
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Nahrání souboru loga jako Base64 Data URL
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        await alert("Obrázek loga by měl mít méně než 2 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(String(reader.result));
      };
      reader.readAsDataURL(file);
    }
  };

  // Nahrání vlastního avataru jako Base64 Data URL
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        await alert("Obrázek avataru by měl mít méně než 2 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setProfileAvatar(String(reader.result));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    if (newPassword) {
      if (newPassword.length < 6) {
        setProfileError("Nové heslo musí mít alespoň 6 znaků.");
        setProfileSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError("Nové heslo a potvrzení hesla se neshodují.");
        setProfileSaving(false);
        return;
      }
      if (!currentPassword) {
        setProfileError("Zadejte Vaše stávající heslo.");
        setProfileSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          avatarUrl: profileAvatar,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Uložení profilu selhalo");

      setProfileSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Nastala chyba při ukládání");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTogglePlugin = (pluginId: string) => {
    if (enabledPlugins.includes(pluginId)) {
      setEnabledPlugins(enabledPlugins.filter((id) => id !== pluginId));
    } else {
      setEnabledPlugins([...enabledPlugins, pluginId]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          logoUrl,
          primaryColor,
          companyDetails: {
            ico,
            dic,
            street,
            city,
            zipCode,
            email,
            phone,
            web,
            smtp: {
              host: smtpHost,
              port: Number(smtpPort) || 587,
              secure: smtpSecure,
              user: smtpUser,
              pass: smtpPass,
              fromEmail: smtpFromEmail,
              fromName: smtpFromName,
            },
          },
          plugins: enabledPlugins,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        router.refresh();
      } else {
        await alert("Nepodařilo se uložit nastavení.");
      }
    } catch (e) {
      console.error(e);
      await alert("Chyba při komunikaci se serverem.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    setDownloadingBackup(true);
    window.location.href = `/api/workspaces/${workspace.slug}/backup`;
    setTimeout(() => setDownloadingBackup(false), 2000);
  };

  const handleTestSmtp = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes("@")) {
      await alert("Zadejte platnou e-mailovou adresu příjemce testu.");
      return;
    }
    if (!smtpHost) {
      await alert("Vyplňte SMTP Host serveru.");
      return;
    }

    setTestingSmtp(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/settings/test-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testEmail: testEmailRecipient,
          smtpConfig: {
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: smtpSecure,
            user: smtpUser,
            pass: smtpPass,
            fromEmail: smtpFromEmail,
            fromName: smtpFromName,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await alert(data.message || "Testovací e-mail byl úspěšně odeslán!");
      } else {
        await alert(data.error || "Chyba při odesílání testovacího e-mailu.");
      }
    } catch (e) {
      console.error(e);
      await alert("Nastala chyba při volání testu SMTP.");
    } finally {
      setTestingSmtp(false);
    }
  };

  const totalTables = workspace.apps.reduce((sum, a) => sum + a.tables.length, 0);
  const totalRecords = workspace.apps.reduce(
    (sum, a) => sum + a.tables.reduce((tSum, t) => tSum + (t._count?.records || 0), 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* Hlavička nastavení */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/${workspace.slug}`}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            title="Zpět do aplikací"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Nastavení firmy a rozšíření</span>
            </h1>
            <p className="text-xs text-slate-500">
              Správa profilu firmy, vlastního loga, aktivních pluginů a záloh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {storage && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs">
              <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-500 font-medium">Úložiště:</span>
              <span className="font-bold text-slate-800">
                {storage.usedFormatted} / {storage.limitFormatted}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">({storage.percentage} %)</span>
            </div>
          )}
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Uloženo!
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Uložit změny</span>
          </button>
        </div>
      </div>

      {/* Přepínač záložek */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-6 text-xs font-semibold shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "company"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Moje firma a Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plugins")}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "plugins"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Puzzle className="w-4 h-4" />
          <span>Pluginy a rozšíření</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
            {enabledPlugins.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "backup"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Záloha celého systému (ZIP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Můj profil a zabezpečení</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("smtp")}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "smtp"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>E-mail a SMTP</span>
          {smtpHost && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="SMTP nakonfigurováno" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("api")}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "api"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Veřejné API a AI integrace</span>
          {apiKeys.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
              {apiKeys.length}
            </span>
          )}
        </button>
      </div>

      {/* Obsah aktivní záložky */}
      <div className="p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* 1. ZÁLOŽKA: MOJE FIRMA */}
        {activeTab === "company" && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Karta: Využití diskového úložiště */}
            {storage && (
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>Diskové úložiště firmy (Přílohy a soubory)</span>
                  </h2>
                  <div className="text-xs font-bold text-slate-700">
                    <span className="text-blue-600 font-mono">{storage.usedFormatted}</span>
                    <span className="text-slate-400 font-normal"> / {storage.limitFormatted}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      storage.percentage >= 90
                        ? "bg-red-100 text-red-700"
                        : storage.percentage >= 75
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {storage.percentage} % zaplněno
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      storage.percentage >= 90
                        ? "bg-red-500"
                        : storage.percentage >= 75
                        ? "bg-amber-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.max(storage.percentage, storage.usedBytes > 0 ? 1 : 0)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Celkem uloženo <strong>{storage.fileCount}</strong> souborů v tabulkách a přílohách
                  </span>
                  <span>
                    Zbývá volné místo:{" "}
                    <strong className="text-slate-700">
                      {Math.max(0, Number(((storage.limitBytes - storage.usedBytes) / (1024 * 1024)).toFixed(1)))} MB
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Sekce 1: Logo a název */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Identita firmy a Vlastní Logo</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Název firmy (zobrazuje se v hlavičce a dokladech)
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="např. Moje Firma s.r.o."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pokud není nastaveno logo, zobrazí se tento název firmy v hlavičce místo textu Foxly.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primární barva brandingu
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-28 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Vlastní Logo */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Vlastní logo firmy (nahradí logo Foxly v levém horním rohu)
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Náhled loga */}
                  <div className="h-14 w-44 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Náhled loga"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Bez loga (text Foxly)</span>
                    )}
                  </div>

                  {/* Možnosti zadání / nahrání */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Vložte URL obrázku loga (https://...)"
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                        >
                          Odstranit
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300 flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Nahrát obrázek loga (PNG, JPG, SVG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Doporučená výška: 32–48 px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sekce 2: Fakturační a kontaktní údaje */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fakturační a kontaktní údaje
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IČO</label>
                  <input
                    type="text"
                    value={ico}
                    onChange={(e) => setIco(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">DIČ</label>
                  <input
                    type="text"
                    value={dic}
                    onChange={(e) => setDic(e.target.value)}
                    placeholder="CZ12345678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Webová stránka</label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={web}
                      onChange={(e) => setWeb(e.target.value)}
                      placeholder="https://www.firma.cz"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ulice a číslo</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Václavské náměstí 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Město</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Praha 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PSČ</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="110 00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kontaktní e-mail</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@firma.cz"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefon</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+420 777 123 456"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Uložit veškeré údaje firmy</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. ZÁLOŽKA: PLUGINY & ROZŠÍŘENÍ */}
        {activeTab === "plugins" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Puzzle className="w-4 h-4 text-blue-600" />
                    <span>Dostupná rozšíření a pluginy</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aktivujte si funkce, které vaše firma potřebuje. Vše lze kdykoli zapnout nebo vypnout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Uložit stav pluginů</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_PLUGINS.map((plug) => {
                const IconComponent = plug.icon;
                const isEnabled = enabledPlugins.includes(plug.id);

                return (
                  <div
                    key={plug.id}
                    className={`bg-white rounded-xl p-5 border transition-all flex flex-col justify-between ${
                      isEnabled
                        ? "border-blue-300 shadow-sm ring-1 ring-blue-500/10"
                        : "border-slate-200 hover:border-slate-300 opacity-90"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: plug.color }}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-900">{plug.name}</h3>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {plug.category}
                            </span>
                          </div>
                        </div>

                        {/* Přepínač Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlugin(plug.id)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isEnabled ? "bg-blue-600" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{plug.desc}</p>
                    </div>

                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span
                        className={`font-semibold ${
                          isEnabled ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {isEnabled ? "✓ Aktivní v systému" : "Vypnuto"}
                      </span>

                      {plug.id === "backup_zip" && isEnabled && (
                        <button
                          type="button"
                          onClick={handleDownloadBackup}
                          className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Stáhnout zálohu nyní
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. ZÁLOŽKA: ZÁLOHOVÁNÍ DO ZIP */}
        {activeTab === "backup" && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileArchive className="w-5 h-5 text-blue-600" />
                  <span>Kompletní záloha všech tabulek do ZIPu</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Jedním kliknutím vygenerujete komprimovaný ZIP archiv se všemi daty firmy.
                  Každá tabulka bude uložena ve formátu <strong>Excel (.xlsx)</strong> i{" "}
                  <strong>strukturovaném JSON</strong> včetně definic sloupců a vazeb.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadingBackup}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {downloadingBackup ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Stáhnout zálohu (ZIP)</span>
              </button>
            </div>

            {/* Statistika dat k zálohování */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Aplikace ve firmě
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {workspace.apps.length}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Celkem tabulek
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalTables}</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Celkem řádků (záznamů)
                </span>
                <div className="text-2xl font-black text-blue-600 mt-1">{totalRecords}</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>Úložiště souborů</span>
                  {storage && (
                    <span className="text-[10px] text-blue-600 font-mono font-bold">
                      {storage.percentage} %
                    </span>
                  )}
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {storage ? storage.usedFormatted : "0 B"}
                  <span className="text-xs font-normal text-slate-500 ml-1">/ 100 MB</span>
                </div>
              </div>
            </div>

            {/* Seznam aplikací a tabulek zahrnutých v záloze */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 p-3 font-bold text-slate-700 border-b border-slate-200">
                Tabulky zahrnuté v záložním archivu
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {workspace.apps.map((app) => (
                  <div key={app.id} className="p-3 bg-white">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>{app.name}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                      {app.tables.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                        >
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t.name}</span>
                          </div>
                          <span className="text-slate-400 font-mono">
                            {t._count.records} záznamů
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. ZÁLOŽKA: MŮJ PROFIL & ZABEZPEČENÍ */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {profileError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Váš profil a heslo byly úspěšně uloženy!</span>
              </div>
            )}

            {/* Karta 1: Profil a Avatar */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Osobní profil a Avatar</span>
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                {/* Náhled avataru */}
                <div className="relative shrink-0">
                  {profileAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileAvatar}
                      alt="Profilový avatar"
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl ring-2 ring-slate-200 shadow-sm">
                      <User className="w-10 h-10 text-white/90" />
                    </div>
                  )}

                  {profileAvatar && (
                    <button
                      type="button"
                      onClick={() => setProfileAvatar("")}
                      title="Obnovit výchozí avatar"
                      className="absolute -top-1 -right-1 p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full border border-slate-200 shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rand = getRandomAnimatedAvatar(avatarCategory === "all" ? undefined : avatarCategory);
                        setProfileAvatar(rand);
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>🎲 Náhodný animovaný avatar</span>
                    </button>

                    <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Vlastní soubor</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                    </label>

                    {profileAvatar && (
                      <button
                        type="button"
                        onClick={() => setProfileAvatar("")}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Výchozí</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Klikněte na „Náhodný animovaný avatar“ pro vygenerování nové postavičky, nebo vyberte z přednastavených níže:
                  </p>
                </div>
              </div>

              {/* Rychlé předvolby animovaných avatarů */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Výběr z animovaných postaviček & robotů:
                  </span>
                  <div className="flex gap-1 text-[11px]">
                    {[
                      { id: "all", label: "Vše" },
                      { id: "characters", label: "Postavy" },
                      { id: "robots", label: "Roboti" },
                      { id: "adventurers", label: "Dobrodruzi" },
                      { id: "emoji", label: "Emoji" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAvatarCategory(cat.id)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          avatarCategory === cat.id
                            ? "bg-blue-600 text-white font-bold"
                            : "text-slate-500 hover:bg-slate-200/60"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {ANIMATED_AVATAR_PRESETS.filter(
                    (av) => avatarCategory === "all" || av.category === avatarCategory
                  ).map((av) => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setProfileAvatar(av.url)}
                      title={av.label}
                      className={`relative rounded-full overflow-hidden transition-all p-0.5 cursor-pointer hover:scale-110 ${
                        profileAvatar === av.url
                          ? "ring-3 ring-blue-600 shadow-md scale-105"
                          : "ring-1 ring-slate-200 hover:ring-blue-300 opacity-85 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={av.url}
                        alt={av.label}
                        className="w-12 h-12 rounded-full object-cover bg-slate-100"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Jméno a email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jméno a příjmení <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Vaše jméno a příjmení"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Přihlašovací e-mail
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ""}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Karta 2: Změna hesla */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Zabezpečení účtu a Změna hesla</span>
              </h2>

              <p className="text-xs text-slate-500 leading-relaxed">
                Pokud si přejete změnit Vaše heslo, vyplňte stávající heslo a zadejte nové heslo o délce minimálně 6 znaků.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Současné heslo
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nové heslo
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimálně 6 znaků"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Potvrzení nového hesla
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Zopakujte nové heslo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Tlačítko uložit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {profileSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Uložit můj profil a heslo</span>
              </button>
            </div>
          </form>
        )}

        {/* ZÁLOŽKA: E-MAIL & VLASTNÍ SMTP */}
        {activeTab === "smtp" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Konfigurace vlastního SMTP serveru</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Nastavte firemní odchozí poštovní server pro automatizované odesílání e-mailů a notifikací (včetně PDF a souborů z tabulek) ve workflow pravidlech.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    SMTP Host server *
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="např. smtp.gmail.com, smtp.seznam.cz nebo mail.firma.cz"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587 nebo 465"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Přihlašovací jméno / Uživatel (Username)
                  </label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="info@firma.cz"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Heslo k SMTP (Password / App Password)
                  </label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    E-mail odesílatele (From Email)
                  </label>
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="notifikace@firma.cz"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jméno odesílatele (From Name)
                  </label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Firma s.r.o. Notifikace"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Použít přímé SSL šifrování (zaškrtněte pro port 465; pro port 587 STARTTLS nechte nezaškrtnuté)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Pokud nevyplníte externí SMTP, systém využije lokální frontu nebo Mailpit.
                </span>

                <button
                  type="button"
                  onClick={(e) => handleSaveSettings(e as any)}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savedSuccess ? "Uloženo!" : "Uložit nastavení SMTP"}</span>
                </button>
              </div>
            </div>

            {/* Testovací odeslání */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Otestovat odeslání e-mailu</span>
              </h3>
              <p className="text-xs text-slate-500">
                Odešlete zkušební zprávu na svůj e-mail pro ověření správného spojení se serverem.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 text-xs">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Váš e-mail (např. jmeno@firma.cz)"
                  className="w-full sm:max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !smtpHost}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {testingSmtp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Odeslat testovací e-mail</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. ZÁLOŽKA: VEŘEJNÉ API & AI INTEGRACE */}
        {activeTab === "api" && (
          <div className="space-y-6">
            {/* Úvodní banner */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>Firemní REST API & AI Přístupové Tokeny</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Vytvořte zabezpečené API klíče s volitelnou nebo neomezenou platností. Pomocí nich můžete propojit své tabulky s AI agenty (ChatGPT, Claude, n8n, Make.com) nebo vlastními aplikacemi pro automatické čtení a zápis záznamů.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingKey(true);
                    setNewlyCreatedToken(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Vytvořit nový API klíč</span>
                </button>
              </div>

              {/* Modální okno pro vygenerovaný token */}
              {newlyCreatedToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Key className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900">API klíč byl úspěšně vygenerován</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Zkopírujte si tento token ihned. Z bezpečnostních důvodů jej ukládáme pouze v šifrované podobě (SHA-256 hash) a po zavření již nebude možné jej znovu zobrazit.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                        <span>Váš tajný API token:</span>
                        {copiedToken && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Zkopírováno!
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs bg-white p-3 border border-slate-300 rounded-lg text-slate-900 break-all select-all font-semibold shadow-inner">
                        {newlyCreatedToken}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        Token bezpečně uložte do konfigurace Vašeho AI asistenta nebo do proměnných prostředí (.env).
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(newlyCreatedToken);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2500);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedToken ? "Zkopírováno!" : "Kopírovat token"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewlyCreatedToken(null);
                          setCopiedToken(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Mám uloženo, zavřít
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upozornění na nově vygenerovaný token */}
              {newlyCreatedToken && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Váš nový API klíč byl úspěšně vygenerován!
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewlyCreatedToken(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Zavřít
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    <strong>Důležité:</strong> Zkopírujte si tento token nyní. Z bezpečnostních důvodů jej ukládáme v šifrované podobě (SHA-256 hash) a v budoucnu již nebude možné jej znovu zobrazit.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 font-mono text-xs bg-white px-3 py-2 border border-emerald-300 rounded-lg text-emerald-950 select-all overflow-x-auto">
                      {newlyCreatedToken}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(newlyCreatedToken);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      {copiedToken ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Zkopírováno!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopírovat token</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulář pro vytvoření nového tokenu */}
              {isCreatingKey && (
                <form
                  onSubmit={handleCreateApiKey}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in"
                >
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Generování nového API klíče</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingKey(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Zrušit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Název klíče / Popis využití
                      </label>
                      <input
                        type="text"
                        required
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="např. AI Agent Zakázky, Make.com automatizace"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Doba platnosti tokenu
                      </label>
                      <select
                        value={newKeyExpiration}
                        onChange={(e) => setNewKeyExpiration(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white cursor-pointer"
                      >
                        <option value="never">Bez omezení (neomezená platnost)</option>
                        <option value="30">30 dní</option>
                        <option value="90">90 dní (3 měsíce)</option>
                        <option value="365">365 dní (1 rok)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingKey(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Vytvořit a zobrazit klíč
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Tabulka existujících klíčů */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Aktivní API Klíče ({apiKeys.length})
                </h3>
                {isLoadingApiKeys && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>

              {apiKeys.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Key className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Zatím nemáte vytvořen žádný API klíč</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Vytvořte si první klíč výše a propojte svůj systém s externími službami nebo AI asistenty.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-4 font-semibold">Název</th>
                        <th className="py-2.5 px-4 font-semibold">Prefix tokenu</th>
                        <th className="py-2.5 px-4 font-semibold">Platnost do</th>
                        <th className="py-2.5 px-4 font-semibold">Vytvořeno</th>
                        <th className="py-2.5 px-4 font-semibold">Poslední použití</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Akce</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {apiKeys.map((k) => {
                        const isExpired = k.expiresAt && new Date(k.expiresAt) < new Date();
                        return (
                          <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-800">{k.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{k.maskedKey || (k.keyPrefix ? `${k.keyPrefix}••••••••` : "foxly_live_••••••••")}</td>
                            <td className="py-3 px-4">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                                  Expirováno
                                </span>
                              ) : k.expiresAt ? (
                                <span className="text-slate-600">
                                  {new Date(k.expiresAt).toLocaleDateString("cs-CZ")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                                  Neomezená
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(k.createdAt).toLocaleDateString("cs-CZ")}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("cs-CZ") : "Zatím nepoužito"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRevokeApiKey(k.id, k.name)}
                                title="Odvolat a smazat API klíč"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dokumentace pro AI a cURL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Instrukce pro AI Agenta */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Prompt instrukce pro AI Agenta</span>
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      const promptText = `Jsi firemní AI asistent pro workspace "${workspace.name}". 
Máš přístup k firemnímu REST API systému Foxly:
1. Zjištění tabulek: GET /api/v1/workspaces/${workspace.slug}/tables
2. Vytvoření aplikace: POST /api/v1/workspaces/${workspace.slug}/apps s JSON tělem { "name": "Název aplikace" }
3. Vytvoření tabulky: POST /api/v1/apps/{appId}/tables s JSON tělem { "name": "Název tabulky" }
4. Čtení záznamů tabulky: GET /api/v1/tables/{tableId}/records
5. Vytvoření záznamu: POST /api/v1/tables/{tableId}/records s JSON tělem { "data": { ... } }
Autorizace: hlavička Authorization: Bearer <VÁŠ_API_TOKEN>`;
                      await navigator.clipboard.writeText(promptText);
                      await alert("Prompt pro AI asistenta byl zkopírován do schránky!");
                    }}
                    className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Kopírovat prompt
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Zkopírujte tento systémový pokyn a vložte jej do svého ChatGPT Custom GPT, Claude Project nebo libovolného agenta.
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto select-all">
                  Jsi firemní asistent pro správu dat.<br />
                  Základní URL: {typeof window !== "undefined" ? window.location.origin : "http://localhost:3005"}<br />
                  Hlavička: Authorization: Bearer &lt;API_TOKEN&gt;<br />
                  Endpointy:<br />
                  • GET /api/v1/workspaces/{workspace.slug}/tables<br />
                  • POST /api/v1/workspaces/{workspace.slug}/apps<br />
                  • POST /api/v1/apps/&#123;appId&#125;/tables<br />
                  • GET /api/v1/tables/&#123;tableId&#125;/records<br />
                  • POST /api/v1/tables/&#123;tableId&#125;/records
                </div>
              </div>

              {/* Box 2: cURL příklady */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span>cURL Ukázka volání</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ukázka čtení a zápisu záznamu přes libovolný terminál nebo backend skript.
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto space-y-2 select-all">
                  <div className="text-slate-400"># 1. Zjištění všech tabulek</div>
                  <div>curl -H &quot;Authorization: Bearer VÁŠ_TOKEN&quot; \</div>
                  <div className="pl-4">{typeof window !== "undefined" ? window.location.origin : "http://localhost:3005"}/api/v1/workspaces/{workspace.slug}/tables</div>

                  <div className="text-slate-400 pt-1"># 2. Vložení nového řádku</div>
                  <div>curl -X POST -H &quot;Authorization: Bearer VÁŠ_TOKEN&quot; \</div>
                  <div className="pl-4">-H &quot;Content-Type: application/json&quot; \</div>
                  <div className="pl-4">-d &#39;&#123;&quot;data&quot;: &#123;&quot;nazev&quot;: &quot;Nová zakázka&quot;&#125;&#125;&#39; \</div>
                  <div className="pl-4">{typeof window !== "undefined" ? window.location.origin : "http://localhost:3005"}/api/v1/tables/&lt;TABLE_ID&gt;/records</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
