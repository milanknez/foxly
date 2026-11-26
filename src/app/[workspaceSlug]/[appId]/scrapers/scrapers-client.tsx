"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
  Trash2,
  ArrowRight,
  ExternalLink,
  Table as TableIcon,
  Sparkles,
  Layers,
  Database,
  Building2,
  Newspaper,
  Coins,
  Loader2,
  Check,
  AlertCircle,
  FileCode,
  Calendar,
  Briefcase,
  HelpCircle,
  Pencil,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
}

interface TableData {
  id: string;
  name: string;
  singularName: string;
  columns: Column[];
}

interface AppData {
  id: string;
  name: string;
  tables: TableData[];
}

interface ScraperItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: {
    preset?: string;
    url?: string;
    schedule?: string;
  };
  actionConfig: {
    fieldMapping?: Record<string, string>;
    dedupeKey?: string | null;
    strategy?: string;
  };
  isActive: boolean;
  createdAt: string;
  table: {
    id: string;
    name: string;
    singularName: string;
    columns: Column[];
  };
  executionLogs: Array<{
    id: string;
    status: string;
    triggerEvent: string;
    details: any;
    createdAt: string;
  }>;
}

interface ScrapersClientProps {
  app: AppData;
  initialScrapers: ScraperItem[];
  workspaceSlug: string;
  appId: string;
}

export default function ScrapersClient({
  app,
  initialScrapers,
  workspaceSlug,
  appId,
}: ScrapersClientProps) {
  const { confirm } = useDialog();
  const [scrapers, setScrapers] = useState<ScraperItem[]>(initialScrapers);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [runningScraperId, setRunningScraperId] = useState<string | null>(null);

  // Formulářová pole pro nový/editovaný scraper
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>(app.tables[0]?.id || "");
  const [preset, setPreset] = useState<"CNB_RATES" | "XML_FEED" | "JOBS_PORTAL" | "ARES_REGISTRY" | "RSS_FEED" | "CUSTOM">("CUSTOM");
  const [url, setUrl] = useState("https://");
  const [schedule, setSchedule] = useState("DAILY_06");
  const [strategy, setStrategy] = useState("UPSERT");
  const [dedupeKey, setDedupeKey] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Živý test v modálu
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    sourceMeta: any;
    sampleRows: any[];
    availableKeys: string[];
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const selectedTable = app.tables.find((t) => t.id === selectedTableId) || app.tables[0];

  // Změna presetu v konfigurátoru
  const handlePresetChange = (newPreset: "CNB_RATES" | "XML_FEED" | "JOBS_PORTAL" | "ARES_REGISTRY" | "RSS_FEED" | "CUSTOM") => {
    setPreset(newPreset);
    setTestResult(null);
    setTestError(null);

    if (newPreset === "CNB_RATES") {
      setName("Denní kurzovní lístek ČNB");
      setUrl("https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt");
      setDescription("Pravidelné stahování oficiálních kurzů měn (EUR, USD, GBP) z České národní banky.");
      setDedupeKey("kod_meny");
    } else if (newPreset === "XML_FEED") {
      setName("Produktový XML Feed (Heureka / Zboží / Shoptet)");
      setUrl("https://obchod.cz/heureka-feed.xml");
      setDescription("Stahování produktů, cen, skladů a obrázků z e-shopů a dodavatelských XML feedů.");
      setDedupeKey("ITEM_ID");
    } else if (newPreset === "ARES_REGISTRY") {
      setName("Registr firem ARES");
      setUrl("https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/");
      setDescription("Ověřování a doplňování IČO, DIČ a adres z Registru ekonomických subjektů MFČR.");
      setDedupeKey("ico");
    } else if (newPreset === "RSS_FEED") {
      setName("RSS Zpravodajský monitoring");
      setUrl("https://servis.idnes.cz/rss.aspx?c=zpravodaj");
      setDescription("Automatické sledování zpráv a oborových novinek.");
      setDedupeKey("odkaz");
    } else {
      setName("Webový scraper (firmy, inzeráty, web)");
      setUrl("https://");
      setDescription("Univerzální vytěžování strukturovaných dat, firem, inzerátů, produktů nebo tabulek z webu.");
      setDedupeKey("nazev");
    }
  };

  // Otevření nového modálu
  const handleOpenNewModal = () => {
    setEditingId(null);
    handlePresetChange("CUSTOM");
    setSelectedTableId(app.tables[0]?.id || "");
    setSchedule("DAILY_06");
    setStrategy("UPSERT");
    setFieldMapping({});
    setSelectedFields([]);
    setTestResult(null);
    setTestError(null);
    setIsConfigModalOpen(true);
  };

  // Otevření existujícího scraperu pro úpravu
  const handleEditScraper = (scraper: ScraperItem) => {
    setEditingId(scraper.id);
    setName(scraper.name);
    setDescription(scraper.description || "");
    setSelectedTableId(scraper.table.id);
    const trigCfg = scraper.triggerConfig || {};
    const actCfg = scraper.actionConfig || {};
    const p = trigCfg.preset === "JOBS_PORTAL" ? "CUSTOM" : (trigCfg.preset || "CUSTOM");
    setPreset(p as any);
    setUrl(trigCfg.url || "");
    setSchedule(trigCfg.schedule || "DAILY_06");
    setStrategy(actCfg.strategy || "UPSERT");
    setDedupeKey(actCfg.dedupeKey || "");
    const mapping = actCfg.fieldMapping || {};
    setFieldMapping(mapping);
    setSelectedFields(Object.keys(mapping).filter((k) => !!mapping[k]));
    setTestResult(null);
    setTestError(null);
    setIsConfigModalOpen(true);
  };

  // Testovací běh (Live Preview)
  const handleTestExtraction = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch(`/api/apps/${appId}/scrapers/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chyba při testu");

      setTestResult(data);

      // Předvyplnění všech nalezených polí jako zaškrtnutých a namapování na sloupce
      if (data.availableKeys && selectedTable) {
        setSelectedFields(data.availableKeys);
        const autoMap: Record<string, string> = { ...fieldMapping };
        data.availableKeys.forEach((key: string) => {
          if (!autoMap[key]) {
            const match = selectedTable.columns.find(
              (c) =>
                c.key.toLowerCase() === key.toLowerCase() ||
                c.label.toLowerCase() === key.toLowerCase() ||
                c.key.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(c.key.toLowerCase()) ||
                c.label.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(c.label.toLowerCase())
            );
            if (match) {
              autoMap[key] = match.key;
            }
          }
        });
        setFieldMapping(autoMap);
      }
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setTesting(false);
    }
  };

  // Uložení konfigurace scraperu
  const handleSaveScraper = async () => {
    if (!name.trim()) return;

    try {
      // Ukládáme pouze ta pole, která jsou zaškrtnutá a mají vybraný cílový sloupec
      const activeMapping: Record<string, string> = {};
      for (const fKey of selectedFields) {
        if (fieldMapping[fKey]) {
          activeMapping[fKey] = fieldMapping[fKey];
        }
      }

      const payload = {
        name: name.trim(),
        description: description || null,
        tableId: selectedTableId,
        preset,
        url,
        schedule,
        strategy,
        dedupeKey: dedupeKey || null,
        fieldMapping: activeMapping,
        isActive: true,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/apps/${appId}/scrapers/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/apps/${appId}/scrapers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Uložení selhalo");

      if (editingId) {
        setScrapers(scrapers.map((s) => (s.id === editingId ? data.scraper : s)));
        showToast("Úloha byla aktualizována!");
      } else {
        setScrapers([data.scraper, ...scrapers]);
        showToast("Nový Web Scraper byl úspěšně vytvořen!");
      }

      setIsConfigModalOpen(false);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Spuštění scraperu (Run Now)
  const handleRunScraper = async (scraperId: string) => {
    setRunningScraperId(scraperId);

    try {
      const res = await fetch(`/api/apps/${appId}/scrapers/${scraperId}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chyba při spuštění");

      showToast(data.message || `Úspěšně staženo a zpracováno!`);

      // Obnovit seznam scraperů s novým logem
      const refresh = await fetch(`/api/apps/${appId}/scrapers`);
      if (refresh.ok) {
        const rJson = await refresh.json();
        setScrapers(rJson.scrapers || []);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRunningScraperId(null);
    }
  };

  // Smazání scraperu
  const handleDeleteScraper = async (scraperId: string) => {
    const isConfirmed = await confirm({
      title: "Smazat úlohu vytěžování?",
      message: "Opravdu chcete smazat tuto úlohu vytěžování dat? Úloha již nebude spouštěna.",
      confirmText: "Smazat úlohu",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/apps/${appId}/scrapers/${scraperId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setScrapers(scrapers.filter((s) => s.id !== scraperId));
        showToast("Úloha byla odstraněna.");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* 1. HLAVIČKA MODULU */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shadow-xs">
            <Globe className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Web Scraper & Automatický Import Dat
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                PRO PLUG-IN
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Plánované vytěžování kurzů ČNB, registru ARES, RSS zpráv a webových stránek přímo do Vašich tabulek
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Nový Web Scraper</span>
        </button>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* 2. STATISTICKÉ KARTY */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Celkem úloh
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{scrapers.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Aktivní plánovače
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {scrapers.filter((s) => s.isActive).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Cílové tabulky
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">{app.tables.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Podporované zdroje
            </span>
            <div className="text-xs font-bold text-slate-700 mt-2 flex items-center gap-1.5">
              <span>ČNB</span> • <span>ARES</span> • <span>RSS</span> • <span>Web HTML</span>
            </div>
          </div>
        </div>

        {/* 3. SEZNAM NAKONFIGUROVANÝCH SCRAPERŮ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Aktivní vytěžovací úlohy ({scrapers.length})
            </h2>
          </div>

          {scrapers.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-3">
              <Globe className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
              <div className="text-sm font-bold text-slate-800">
                Zatím nemáte nastavený žádný Web Scraper
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Vytvořte si automatické stahování denních kurzů ČNB, ověřování firem z ARES nebo monitoring konkurence.
              </p>
              <button
                onClick={handleOpenNewModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" /> Vytvořit první úlohu
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scrapers.map((scraper) => {
                const trCfg = scraper.triggerConfig || {};
                const actCfg = scraper.actionConfig || {};
                const lastLog = scraper.executionLogs?.[0];
                const isRunning = runningScraperId === scraper.id;

                let PresetIcon = Globe;
                let presetBadge = "Vlastní web";
                let badgeBg = "bg-slate-100 text-slate-700";

                if (trCfg.preset === "CNB_RATES") {
                  PresetIcon = Coins;
                  presetBadge = "ČNB Kurzy";
                  badgeBg = "bg-amber-100 text-amber-800";
                } else if (trCfg.preset === "XML_FEED") {
                  PresetIcon = FileCode;
                  presetBadge = "XML Feed (E-shop)";
                  badgeBg = "bg-emerald-100 text-emerald-800";
                } else if (trCfg.preset === "JOBS_PORTAL") {
                  PresetIcon = Briefcase;
                  presetBadge = "Nabídky práce";
                  badgeBg = "bg-rose-100 text-rose-800";
                } else if (trCfg.preset === "ARES_REGISTRY") {
                  PresetIcon = Building2;
                  presetBadge = "ARES MFČR";
                  badgeBg = "bg-blue-100 text-blue-800";
                } else if (trCfg.preset === "RSS_FEED") {
                  PresetIcon = Newspaper;
                  presetBadge = "RSS Feed";
                  badgeBg = "bg-purple-100 text-purple-800";
                }

                return (
                  <div
                    key={scraper.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badgeBg}`}>
                          <PresetIcon className="w-3 h-3" />
                          <span>{presetBadge}</span>
                        </span>

                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {trCfg.schedule === "DAILY_06"
                              ? "Denně v 06:00"
                              : trCfg.schedule === "HOURLY"
                              ? "Každou hodinu"
                              : trCfg.schedule === "WEEKLY"
                              ? "Týdně"
                              : "Ručně"}
                          </span>
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                          {scraper.name}
                        </h3>
                        {scraper.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {scraper.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Cílová tabulka:</span>
                          <span className="font-bold text-slate-800">
                            {scraper.table.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Režim ukládání:</span>
                          <span className="font-mono text-[11px] text-blue-700 font-semibold">
                            {actCfg.strategy === "UPSERT" ? "Aktualizace (Upsert)" : "Vždy přidat (Append)"}
                          </span>
                        </div>
                      </div>

                      {/* Informace o posledním běhu */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {lastLog ? (
                            lastLog.status === "SUCCESS" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                            )
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="text-[11px] text-slate-600 font-medium">
                            {lastLog
                              ? `Poslední běh: ${new Date(lastLog.createdAt).toLocaleDateString("cs-CZ")}`
                              : "Zatím nespuštěno"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Akční tlačítka */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleRunScraper(scraper.id)}
                        disabled={isRunning}
                        className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>{isRunning ? "Vytěžuji..." : "Spustit ihned"}</span>
                      </button>

                      <button
                        onClick={() => handleEditScraper(scraper)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Upravit konfiguraci scraperu a mapování polí"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteScraper(scraper.id)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Smazat úlohu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          4. VIZUÁLNÍ KONFIGURÁTOR SCRAPERU (MODAL)
          ======================================================== */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Hlavička modálu */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-cyan-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingId ? "Úprava Web Scraperu" : "Konfigurátor nového Web Scraperu"}
                </h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Tělo konfigurátoru se záložkami */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Krok 1: Výběr předlohy */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                  1. Zvolte typ zdroje dat:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { id: "CUSTOM", label: "Webový scraper", icon: Globe, desc: "Web, portál, firmy, inzeráty, e-shop" },
                    { id: "ARES_REGISTRY", label: "ARES Firmy", icon: Building2, desc: "IČO, DIČ, sídla firem z MFČR" },
                    { id: "XML_FEED", label: "XML Feed", icon: FileCode, desc: "Heureka, Zboží, Shoptet, e-shop" },
                    { id: "CNB_RATES", label: "ČNB Kurzy měn", icon: Coins, desc: "Denní kurzy EUR, USD z ČNB" },
                    { id: "RSS_FEED", label: "RSS Feed", icon: Newspaper, desc: "Zprávy, novinky a články" },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = preset === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handlePresetChange(p.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs"
                            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                        <div className="font-bold leading-tight">{p.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Krok 2: Základní nastavení */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Název úlohy <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Např. Denní aktualizace kurzů EUR/USD"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cílová tabulka pro zápis dat <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {app.tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.columns.length} sloupců)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* URL adresa zdroje */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  URL adresa zdroje dat <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleTestExtraction}
                    disabled={testing || !url.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{testing ? "Testuji..." : "🧪 Otestovat vytěžení"}</span>
                  </button>
                </div>

                {/* Průvodce / Vysvětlení jak funguje vytěžování pracovních portálů a vlastních webů */}
                {(preset === "JOBS_PORTAL" || preset === "CUSTOM") && (
                  <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-950 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-blue-900">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Jak Foxly vytěžuje nabídky z pracovních portálů a vlastních webů?</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside pl-0.5">
                      <li>
                        <strong className="text-slate-800">1. Google Jobs JSON-LD:</strong> Portály (Jobs.cz, StartupJobs) publikují skrytá data pro Google. Scraper je automaticky rozpozná a vytáhne pozici, firmu, mzdu i město.
                      </li>
                      <li>
                        <strong className="text-slate-800">2. HTML Karty & Inzeráty:</strong> Automaticky detekuje opakující se bloky (<code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">article</code>, <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">.job-card</code>) a z nich extrahuje odkazy a texty.
                      </li>
                      <li>
                        <strong className="text-slate-800">3. JSON REST API & RSS:</strong> Pokud portál nabízí otevřený API endpoint (např. Remotive, GitHub Jobs, interní API), scraper rovnou přečte strukturovaný JSON.
                      </li>
                      <li>
                        <strong className="text-slate-800">4. Automatická deduplikace:</strong> Jako párovací klíč zvolte <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">odkaz</code> – denně se pak uloží pouze nově vypsané inzeráty!
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* ŽIVÝ NÁHLED Z TESTU (TEST SANDBOX) */}
              {testError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}

              {testResult && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Živý náhled dat (nalezeno {testResult.sourceMeta?.totalFound || testResult.sampleRows.length} řádků):
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      Zdroj: {testResult.sourceMeta?.name}
                    </span>
                  </div>

                  <div className="border border-emerald-200 rounded-lg overflow-x-auto bg-white max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-emerald-100/60 text-emerald-950 font-bold border-b border-emerald-200">
                        <tr>
                          {testResult.availableKeys.map((k) => (
                            <th key={k} className="py-1.5 px-2.5 whitespace-nowrap">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {testResult.sampleRows.slice(0, 4).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {testResult.availableKeys.map((k) => (
                              <td key={k} className="py-1 px-2.5 whitespace-nowrap font-mono text-slate-700">
                                {String(row[k] ?? "-")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* KROK 3: VÝBĚR A MAPOVÁNÍ POLÍ DO TABULKY */}
              {testResult && testResult.availableKeys.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                        Výběr a mapování údajů do tabulky ({selectedFields.length} / {testResult.availableKeys.length} vybráno):
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Zaškrtněte údaje z webu, které chcete do tabulky ukládat. Nezaškrtnutá pole budou při stahování ignorována.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFields(testResult.availableKeys);
                          const autoMap: Record<string, string> = { ...fieldMapping };
                          testResult.availableKeys.forEach((key) => {
                            if (!autoMap[key]) {
                              const match = selectedTable.columns.find(
                                (c) =>
                                  c.key.toLowerCase() === key.toLowerCase() ||
                                  c.label.toLowerCase() === key.toLowerCase() ||
                                  c.key.toLowerCase().includes(key.toLowerCase()) ||
                                  key.toLowerCase().includes(c.key.toLowerCase()) ||
                                  c.label.toLowerCase().includes(key.toLowerCase()) ||
                                  key.toLowerCase().includes(c.label.toLowerCase())
                              );
                              if (match) autoMap[key] = match.key;
                            }
                          });
                          setFieldMapping(autoMap);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                      >
                        Zaškrtnout vše
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFields([])}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        Odznačit vše
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-72 overflow-y-auto">
                    {testResult.availableKeys.map((key) => {
                      const isChecked = selectedFields.includes(key);
                      const sampleVal = testResult.sampleRows?.[0]?.[key];
                      const currentTargetCol = fieldMapping[key] || "";

                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                            isChecked
                              ? "bg-white border-blue-200 shadow-2xs"
                              : "bg-slate-100/50 border-slate-200 opacity-60"
                          }`}
                        >
                          {/* Checkbox a název pole z webu */}
                          <div className="flex items-center gap-2.5 min-w-[220px]">
                            <input
                              type="checkbox"
                              id={`field-cb-${key}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFields([...selectedFields, key]);
                                  if (!fieldMapping[key]) {
                                    const match = selectedTable.columns.find(
                                      (c) =>
                                        c.key.toLowerCase() === key.toLowerCase() ||
                                        c.label.toLowerCase() === key.toLowerCase() ||
                                        c.key.toLowerCase().includes(key.toLowerCase()) ||
                                        key.toLowerCase().includes(c.key.toLowerCase()) ||
                                        c.label.toLowerCase().includes(key.toLowerCase()) ||
                                        key.toLowerCase().includes(c.label.toLowerCase())
                                    );
                                    if (match) {
                                      setFieldMapping((prev) => ({ ...prev, [key]: match.key }));
                                    }
                                  }
                                } else {
                                  setSelectedFields(selectedFields.filter((f) => f !== key));
                                }
                              }}
                              className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <label
                              htmlFor={`field-cb-${key}`}
                              className="font-mono text-xs font-bold text-slate-800 cursor-pointer"
                            >
                              {key}
                            </label>
                            {sampleVal !== undefined && (
                              <span
                                className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]"
                                title={String(sampleVal)}
                              >
                                {String(sampleVal)}
                              </span>
                            )}
                          </div>

                          {/* Šipka přiřazení */}
                          <div className="text-slate-400 font-bold text-xs select-none">→</div>

                          {/* Dropdown výběru sloupce v cílové tabulce */}
                          <div className="flex-1 max-w-sm">
                            <select
                              value={currentTargetCol}
                              disabled={!isChecked}
                              onChange={(e) => {
                                setFieldMapping((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }));
                              }}
                              className={`w-full py-1.5 px-2.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                                !isChecked
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : currentTargetCol
                                  ? "bg-white border-blue-400 text-blue-900 font-medium"
                                  : "bg-white border-amber-300 text-amber-700 font-normal"
                              }`}
                            >
                              <option value="">-- Vyberte sloupec tabulky --</option>
                              {selectedTable.columns.map((col) => (
                                <option key={col.id} value={col.key}>
                                  {col.label} ({col.key}) [{col.type}]
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Krok 4: Plánovač a Deduplikace */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Frekvence stahování</label>
                  <select
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="DAILY_06">Každý den v 06:00 ráno</option>
                    <option value="HOURLY">Každou hodinu</option>
                    <option value="WEEKLY">Jednou týdně (Pondělí)</option>
                    <option value="MANUAL">Pouze ručně tlačítkem</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Strategie při shodě</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="UPSERT">Aktualizovat existující záznam (Upsert)</option>
                    <option value="APPEND">Vždy vytvořit nový záznam (Historie)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Párovací unikátní klíč</label>
                  <input
                    type="text"
                    value={dedupeKey}
                    onChange={(e) => setDedupeKey(e.target.value)}
                    placeholder="Např. kod_meny nebo ico"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Patička modálu */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleSaveScraper}
                disabled={!name.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                Uložit Web Scraper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifikace */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white animate-in slide-in-from-bottom-2 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
