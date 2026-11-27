"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Trash2,
  Zap,
  XCircle,
  Search,
  Filter,
  Eye,
  Paperclip,
  ShieldCheck,
  Send,
  Loader2,
  ArrowRight,
  Settings,
  Sparkles,
} from "lucide-react";

interface QueueItem {
  id: string;
  workspaceId: string;
  automationId?: string | null;
  recordId?: string | null;
  to: string;
  subject: string;
  body: string;
  html?: string | null;
  attachments?: any[];
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
  error?: string | null;
  attempts: number;
  scheduledFor: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  automation?: { id: string; name: string } | null;
}

interface Stats {
  PENDING: number;
  PROCESSING: number;
  SENT: number;
  FAILED: number;
  CANCELLED: number;
  total: number;
}

interface EmailQueueClientProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    companyDetails: Record<string, any>;
    plugins: string[];
  };
  userRole: string;
}

const DELAY_OPTIONS = [
  { value: 5, label: "5 sekund", desc: "Vhodné pro rychlé testování na localhostu" },
  { value: 10, label: "10 sekund", desc: "Základní rozestup" },
  { value: 30, label: "30 sekund", desc: "Dobrý kompromis rychlosti a bezpečnosti" },
  { value: 60, label: "1 minuta", desc: "Doporučené standardní tempo (prevence spamu)", recommended: true },
  { value: 180, label: "3 minuty", desc: "Vysoká bezpečnost pro citlivé firemní domény" },
  { value: 300, label: "5 minut", desc: "Maximální ochrana pro velké hromadné rozesílky" },
  { value: 600, label: "10 minut", desc: "Konzervativní tempo pro přísné SMTP servery" },
];

export default function EmailQueueClient({ workspace }: EmailQueueClientProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    PENDING: 0,
    PROCESSING: 0,
    SENT: 0,
    FAILED: 0,
    CANCELLED: 0,
    total: 0,
  });
  const [currentDelay, setCurrentDelay] = useState<number>(
    Number(workspace.companyDetails?.emailQueueDelay) || 60
  );
  const [isPluginActive, setIsPluginActive] = useState<boolean>(
    Array.isArray(workspace.plugins) && workspace.plugins.includes("email_queue")
  );

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [savingDelay, setSavingDelay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Načtení dat fronty
  const fetchQueueData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setStats(data.stats || { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0, CANCELLED: 0, total: 0 });
        if (data.currentDelay) setCurrentDelay(data.currentDelay);
        if (typeof data.isPluginEnabled === "boolean") setIsPluginActive(data.isPluginEnabled);
      }
    } catch (err) {
      console.error("Chyba při načítání fronty:", err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [workspace.slug]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Automatické zpracování (když je zapnuto a existují čekající položky)
  useEffect(() => {
    if (!autoProcessEnabled) return;

    const interval = setInterval(async () => {
      // Pokud máme čekající položku s časem <= now, pošleme požadavek na odbavení
      const now = new Date().getTime();
      const hasReadyItem = items.some(
        (it) => it.status === "PENDING" && new Date(it.scheduledFor).getTime() <= now
      );

      if (hasReadyItem && !processing) {
        try {
          const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/process`, {
            method: "POST",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.processed) {
              fetchQueueData(true);
            }
          }
        } catch {
          // Tichá chyba na pozadí
        }
      } else {
        // Občasné tiché obnovení dat
        fetchQueueData(true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [autoProcessEnabled, items, processing, workspace.slug, fetchQueueData]);

  // Uložení zvolené prodlevy
  const handleSelectDelay = async (newDelay: number) => {
    setCurrentDelay(newDelay);
    setSavingDelay(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delaySeconds: newDelay }),
      });
      if (res.ok) {
        showToast(
          `Prodleva mezi e-maily byla nastavena na ${DELAY_OPTIONS.find((o) => o.value === newDelay)?.label || `${newDelay} s`}.`,
          "success"
        );
      } else {
        showToast("Nepodařilo se uložit nastavení prodlevy.", "error");
      }
    } catch {
      showToast("Chyba při ukládání nastavení.", "error");
    } finally {
      setSavingDelay(false);
    }
  };

  // Akce: Odeslat další ihned
  const handleProcessNextNow = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.processed) {
        if (data.success) {
          showToast(`E-mail pro ${data.item?.to || "příjemce"} byl úspěšně odeslán.`, "success");
        } else {
          showToast(`Odeslání selhalo: ${data.error || "Chyba SMTP"}`, "error");
        }
        await fetchQueueData(true);
      } else {
        showToast("Žádný e-mail ve frontě momentálně nečeká na odeslání.", "info");
      }
    } catch {
      showToast("Chyba při odesílání ze serveru.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // Akce: Spustit konkrétní položku ihned
  const handleForceSend = async (itemId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_send", itemId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("E-mail byl okamžitě odeslán.", "success");
        await fetchQueueData(true);
      } else {
        showToast(`Odeslání selhalo: ${data.error || "Neznámá chyba"}`, "error");
        await fetchQueueData(true);
      }
    } catch {
      showToast("Chyba při komunikaci se serverem.", "error");
    }
  };

  // Akce: Znovu zařadit do fronty (Retry)
  const handleRetry = async (itemId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", itemId }),
      });
      if (res.ok) {
        showToast("E-mail byl znovu zařazen do fronty.", "success");
        await fetchQueueData(true);
      }
    } catch {
      showToast("Chyba při zařazování do fronty.", "error");
    }
  };

  // Akce: Zrušit položku
  const handleCancel = async (itemId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", itemId }),
      });
      if (res.ok) {
        showToast("E-mail byl zrušen.", "info");
        await fetchQueueData(true);
      }
    } catch {
      showToast("Chyba při rušení e-mailu.", "error");
    }
  };

  // Akce: Smazat položku
  const handleDelete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", itemId }),
      });
      if (res.ok) {
        showToast("Položka byla odstraněna.", "info");
        await fetchQueueData(true);
      }
    } catch {
      showToast("Chyba při odstraňování.", "error");
    }
  };

  // Akce: Vyčistit dokončené (SENT + CANCELLED)
  const handleClearCompleted = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_completed" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Vyčištěno ${data.deletedCount || 0} dokončených položek.`, "success");
        await fetchQueueData(true);
      }
    } catch {
      showToast("Chyba při čištění fronty.", "error");
    }
  };

  // Akce: Znovu zkusit všechny chyby
  const handleRetryAllFailed = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/email-queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_all_failed" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.retriedCount || 0} neúspěšných e-mailů bylo znovu zařazeno do fronty.`, "success");
        await fetchQueueData(true);
      }
    } catch {
      showToast("Chyba při operaci.", "error");
    }
  };

  // Filtrované položky
  const filteredItems = items.filter((it) => {
    if (statusFilter !== "ALL" && it.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTo = it.to?.toLowerCase().includes(q);
      const matchSubject = it.subject?.toLowerCase().includes(q);
      const matchAuto = it.automation?.name?.toLowerCase().includes(q);
      return matchTo || matchSubject || matchAuto;
    }
    return true;
  });

  // Pomocné formátování data
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  };

  const getRelativeScheduledText = (scheduledStr: string, status: string) => {
    if (status !== "PENDING") return null;
    const diffMs = new Date(scheduledStr).getTime() - new Date().getTime();
    if (diffMs <= 0) return "Ihned na řadě";
    const diffSec = Math.ceil(diffMs / 1000);
    if (diffSec < 60) return `za ${diffSec} s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (secs === 0) return `za ${mins} min`;
    return `za ${mins} m ${secs} s`;
  };

  return (
    <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
      {/* Toast notifikace */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : toast.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-800"
              : "bg-blue-50 border-blue-300 text-blue-800"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600" />}
          {toast.type === "info" && <Sparkles className="w-4 h-4 text-blue-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HLAVNÍ HLAVIČKA */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900">Fronta e-mailů & Anti-Spam ochrana</h1>
                {isPluginActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Aktivní plugin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Neaktivní
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Zajišťuje bezpečné a postupné rozesílání e-mailů s nastavitelným časovým rozestupem. Zabraňuje
                překročení limitů vašeho SMTP serveru a chrání vaši doménu před zařazením do spam filtrů (Google, Seznam, Microsoft 365).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${workspace.slug}/settings`}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Nastavení pluginů</span>
            </Link>
            <button
              onClick={() => fetchQueueData(false)}
              disabled={loading}
              title="Obnovit stav fronty"
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Upozornění pokud plugin není v nastavení povolen */}
        {!isPluginActive && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Plugin <strong>Fronta e-mailů & Anti-Spam ochrana</strong> není v nastavení firmy aktivován. Odchozí
                e-maily se nyní odesílají okamžitě bez prodlevy.
              </span>
            </div>
            <Link
              href={`/${workspace.slug}/settings`}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold shrink-0 transition-colors"
            >
              Aktivovat v Pluginech
            </Link>
          </div>
        )}
      </div>

      {/* BLOK 1: NASTAVENÍ PRODLEVY (ANTI-SPAM RYCHLOST) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Výběr prodlevy mezi e-maily (Anti-Spam ochrana)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Určuje, kolik času Foxly počká mezi odesláním každého jednotlivého e-mailu při hromadném spuštění workflow.
            </p>
          </div>

          {savingDelay && (
            <span className="text-xs text-sky-600 font-semibold flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ukládám prodlevu...
            </span>
          )}
        </div>

        {/* Tlačítka pro volbu intervalu */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {DELAY_OPTIONS.map((opt) => {
            const isSelected = currentDelay === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectDelay(opt.value)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/70 text-sky-950 shadow-xs ring-1 ring-sky-500"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-sm font-bold">{opt.label}</span>
                    {opt.recommended && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                        Doporučeno
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{opt.desc}</p>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${isSelected ? "text-sky-700" : "text-slate-400"}`}>
                    {isSelected ? "✓ Vybráno" : "Zvolit"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {opt.value < 60 ? `${opt.value}s` : `${opt.value / 60}m`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Příklad: Při označení 20 záznamů a zvolené prodlevě <strong>{DELAY_OPTIONS.find((o) => o.value === currentDelay)?.label || `${currentDelay} s`}</strong>{" "}
            se 1. e-mail odešle ihned, 2. za {DELAY_OPTIONS.find((o) => o.value === currentDelay)?.label || `${currentDelay} s`}, 3. za dvojnásobek času atd. 
            Server příjemce tak nikdy nezaznamená podezřelý hromadný nával.
          </span>
        </div>
      </div>

      {/* METRIKY FRONT (STAVOVÉ KARTY) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Čeká ve frontě</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.PENDING}</div>
          <span className="text-[10px] text-slate-400 font-medium">připraveno k odeslání</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Odesílá se</span>
            {stats.PROCESSING > 0 ? (
              <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="text-2xl font-black text-sky-600">{stats.PROCESSING}</div>
          <span className="text-[10px] text-slate-400 font-medium">právě v komunikaci se SMTP</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Úspěšně odesláno</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.SENT}</div>
          <span className="text-[10px] text-slate-400 font-medium">doručeno na SMTP server</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Chyba doručení</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.FAILED}</div>
          <span className="text-[10px] text-slate-400 font-medium">selhání autentizace / adresa</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Celkem v evidenci</span>
            <Mail className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
          <span className="text-[10px] text-slate-400 font-medium">všech záznamů</span>
        </div>
      </div>

      {/* OVLÁDACÍ A AKČNÍ PANEL */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Stav odbavování */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                autoProcessEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
              }`}
            />
            <span className="text-xs font-bold text-slate-800">
              {autoProcessEnabled ? "Automatické odbavování běží" : "Odbavování pozastaveno"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAutoProcessEnabled(!autoProcessEnabled)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            {autoProcessEnabled ? "Pozastavit" : "Spustit"}
          </button>
        </div>

        {/* Tlačítka pro manuální zásah */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleProcessNextNow}
            disabled={processing || stats.PENDING === 0}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Odešle nejstarší čekající e-mail ihned bez čekání na časovač"
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Odeslat další ihned</span>
          </button>

          {stats.FAILED > 0 && (
            <button
              type="button"
              onClick={handleRetryAllFailed}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Vrátí všechny chybné zprávy zpět do fronty k opakovanému odeslání"
            >
              <RotateCw className="w-3.5 h-3.5 text-rose-600" />
              <span>Opakovat chyby ({stats.FAILED})</span>
            </button>
          )}

          {(stats.SENT > 0 || stats.CANCELLED > 0) && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Smaže z databáze úspěšně doručené a zrušené záznamy"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Vyčistit dokončené</span>
            </button>
          )}
        </div>
      </div>

      {/* SEZNAM A TABULKA E-MAILŮ VE FRONTĚ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filtrační a vyhledávací lišta */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          {/* Záložky filtrů stavu */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: "ALL", label: "Všechny", count: stats.total },
              { key: "PENDING", label: "Čeká", count: stats.PENDING },
              { key: "PROCESSING", label: "Odesílá se", count: stats.PROCESSING },
              { key: "SENT", label: "Odesláno", count: stats.SENT },
              { key: "FAILED", label: "Chyby", count: stats.FAILED },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === f.key
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === f.key ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-500"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Vyhledávací pole */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat příjemce, předmět..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Tabulka */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
            <p className="text-xs">Načítám frontu e-mailů...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Mail className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Fronta je prázdná</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Žádné e-maily momentálně nečekají ani neodpovídají zadanému filtru. Když spustíte workflow s odesláním
              e-mailu, zprávy se automaticky zařadí sem.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Stav</th>
                  <th className="py-3 px-4">Příjemce</th>
                  <th className="py-3 px-4">Předmět e-mailu</th>
                  <th className="py-3 px-4">Zdroj (Workflow)</th>
                  <th className="py-3 px-4">Naplánováno / Odesláno</th>
                  <th className="py-3 px-4 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const relativeSched = getRelativeScheduledText(item.scheduledFor, item.status);
                  const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Stav */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Čeká {relativeSched ? `(${relativeSched})` : ""}</span>
                          </span>
                        )}
                        {item.status === "PROCESSING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            <Loader2 className="w-3 h-3 text-sky-600 animate-spin" />
                            <span>Odesílá se...</span>
                          </span>
                        )}
                        {item.status === "SENT" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Odesláno</span>
                          </span>
                        )}
                        {item.status === "FAILED" && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200"
                            title={item.error || "Chyba odeslání"}
                          >
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Chyba</span>
                          </span>
                        )}
                        {item.status === "CANCELLED" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Zrušeno</span>
                          </span>
                        )}
                      </td>

                      {/* 2. Příjemce */}
                      <td className="py-3 px-4 font-medium text-slate-800 font-mono text-[11px]">
                        {item.to}
                      </td>

                      {/* 3. Předmět */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{item.subject}</span>
                          {hasAttachments && (
                            <span className="shrink-0 text-slate-400" title={`Přílohy: ${item.attachments?.length}`}>
                              <Paperclip className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.body.slice(0, 80)}...
                        </div>
                        {item.error && (
                          <div className="text-[10px] text-rose-600 font-medium mt-1 truncate" title={item.error}>
                            ⚠️ {item.error}
                          </div>
                        )}
                      </td>

                      {/* 4. Zdroj */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {item.automation ? (
                          <span className="text-slate-700 font-medium">{item.automation.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Workflow / API</span>
                        )}
                      </td>

                      {/* 5. Naplánováno / Odesláno */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {item.status === "SENT" ? (
                          <span className="text-emerald-700 font-medium">✓ {formatTime(item.sentAt)}</span>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">
                            {formatTime(item.scheduledFor)}
                          </span>
                        )}
                      </td>

                      {/* 6. Akce */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            title="Zobrazit detail a tělo e-mailu"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {item.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleForceSend(item.id)}
                                title="Odeslat ihned přeskočením čekání"
                                className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancel(item.id)}
                                title="Zrušit odeslání"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {item.status === "FAILED" && (
                            <button
                              type="button"
                              onClick={() => handleRetry(item.id)}
                              title="Znovu zařadit do fronty k odeslání"
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(item.status === "SENT" || item.status === "CANCELLED") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              title="Smazat záznam"
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODÁLNÍ OKNO: DETAIL E-MAILU */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Hlavička modalu */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detail odchozího e-mailu</h3>
                  <p className="text-[11px] text-slate-500 font-mono">ID: {selectedItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Obsah modalu */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Příjemce</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedItem.to}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Stav položky</span>
                  <span className="font-semibold text-slate-800">{selectedItem.status}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Naplánováno na</span>
                  <span className="text-slate-700 font-mono">{formatTime(selectedItem.scheduledFor)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Odesláno</span>
                  <span className="text-slate-700 font-mono">{formatTime(selectedItem.sentAt)}</span>
                </div>
              </div>

              {selectedItem.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Chyba doručení ze serveru:
                  </span>
                  <p className="font-mono text-[11px] leading-relaxed break-words">{selectedItem.error}</p>
                </div>
              )}

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Předmět</span>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-900">
                  {selectedItem.subject}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Obsah zprávy</span>
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 whitespace-pre-wrap font-sans text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
                  {selectedItem.body}
                </div>
              </div>

              {Array.isArray(selectedItem.attachments) && selectedItem.attachments.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Přílohy ({selectedItem.attachments.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-700 flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3 text-slate-500" />
                        {att.filename || `Příloha ${idx + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Patička modalu */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Počet pokusů: {selectedItem.attempts}</span>
              <div className="flex items-center gap-2">
                {selectedItem.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleForceSend(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" /> Odeslat ihned
                  </button>
                )}
                {selectedItem.status === "FAILED" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleRetry(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Zkusit znovu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Zavřít
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
