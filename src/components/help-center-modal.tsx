"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  X,
  Search,
  BookOpen,
  Keyboard,
  Sparkles,
  Zap,
  Code2,
  Table as TableIcon,
  SlidersHorizontal,
  FileSpreadsheet,
  ScanText,
  Key,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Lightbulb,
  Palette,
  Send,
  Loader2,
  Flame,
  ArrowRight,
  FileText,
} from "lucide-react";

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug?: string;
  initialCategory?: string;
}

interface HelpArticle {
  id: string;
  category: "basics" | "shortcuts" | "widgets" | "api" | "import" | "formatting" | "faq";
  categoryLabel: string;
  title: string;
  summary: string;
  icon: React.ElementType;
  badge?: string;
  content: React.ReactNode;
}

export default function HelpCenterModal({
  isOpen,
  onClose,
  workspaceSlug = "demo-firma",
  initialCategory = "all",
}: HelpCenterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // Formulář zpětné vazby
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Kolekce článků a návodů
  const articles: HelpArticle[] = useMemo(
    () => [
      {
        id: "inline-editing",
        category: "basics",
        categoryLabel: "Základy & Práce s tabulkou",
        title: "Inline editace buněk a hromadné ukládání změn",
        summary: "Jak bleskově upravovat hodnoty přímo v mřížce a bezpečně ukládat změny.",
        icon: FileSpreadsheet,
        badge: "Doporučeno",
        content: (
          <div className="space-y-3">
            <p>
              Ve Foxly můžete hodnoty v tabulce upravovat okamžitě bez nutnosti otevírat modální okno pro každý řádek:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Dvojklik do buňky:</strong> Aktivuje editační pole buňky (text, číslo, datum či výběr).
              </li>
              <li>
                <strong>Barevné zvýraznění změn:</strong> Jakmile hodnotu změníte, buňka se zbarví jemně žlutě, což indikuje neuloženou změnu.
              </li>
              <li>
                <strong>Hromadné uložení (Ctrl + S):</strong> V horním panelu tabulky se objeví tlačítko <em>&quot;Uložit změny (počet)&quot;</em>. Můžete upravit desítky buněk naráz a jedním klikem nebo zkratkou <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[11px]">Ctrl+S</kbd> je zapsat do databáze v jedné dávce.
              </li>
              <li>
                <strong>Detail záznamu:</strong> Kliknutím na řádek nebo ikonu tužky otevřete kompletní detailový formulář záznamu.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "keyboard-shortcuts",
        category: "shortcuts",
        categoryLabel: "Klávesové zkratky",
        title: "Přehled klávesových zkratek pro rychlou práci",
        summary: "Ovládejte systém jako profesionál pomocí klávesnice.",
        icon: Keyboard,
        badge: "Tahák",
        content: (
          <div className="space-y-4">
            <p>
              Pro maximální efektivitu můžete tabulky ovládat těmito klávesovými zkratkami:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Uložit neuložené změny</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">Ctrl + S</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Vyhledat v tabulce</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">Ctrl + F</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Přidat nový řádek</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">Ctrl + N</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Hromadná úprava vybraných</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">Ctrl + E</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Zavřít okno / zrušit výběr</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">Esc</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Otevřít Centrum nápovědy</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">?</kbd>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "widgets-guide",
        category: "widgets",
        categoryLabel: "Widgety & Dashboard",
        title: "KPI Widgety: Metriky, HTML bannery, šířka v gridu a řazení",
        summary: "Vše o analytických kartách nad tabulkou a jejich sbalování.",
        icon: Flame,
        badge: "Nové",
        content: (
          <div className="space-y-3">
            <p>
              Nad každou tabulkou můžete mít vlastní analytický panel widgetů:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Metrika / Agregace:</strong> Výpočet počtu (#), součtu (Σ), průměru (x̄), minima nebo maxima. Kliknutím na kartu se tabulka okamžitě zafiltruje podle nadefinované podmínky.
              </li>
              <li>
                <strong>HTML & Textový banner:</strong> Karta s vlastním textem, oznámením pro kolegy nebo HTML formátováním.
              </li>
              <li>
                <strong>Rychlá akce / Odkaz:</strong> Tlačítko se spuštěním externí URL nebo rychlé akce jedním klikem.
              </li>
              <li>
                <strong>Změna velikosti v gridu:</strong> Každý widget může mít šířku <em>Standardní (1x)</em>, <em>Dvojitá (2x)</em> nebo <em>Plná šířka (Full)</em>.
              </li>
              <li>
                <strong>Přesouvání:</strong> Při najetí na widget se zobrazí šipky <code>&lt;</code> a <code>&gt;</code> pro snadné přesouvání doleva/doprava.
              </li>
              <li>
                <strong>Co když všechny smažu?</strong> Celý řádek widgetů se <strong>zcela sbalí a zmizí (výška 0 px)</strong>, takže tabulka dostane 100% výšky obrazovky. Kdykoliv můžete widgety vrátit tlačítkem <em>+ Přidat widget</em> v nástrojové liště.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "badge-styles",
        category: "formatting",
        categoryLabel: "Štítky & Vzhled",
        title: "Styly stavových štítků (Odrážka kruh, čtverec, plné pozadí)",
        summary: "Přizpůsobení vizuální prezentace výběrových stavů a štítků v tabulce.",
        icon: Palette,
        content: (
          <div className="space-y-3">
            <p>
              Pro sloupce typu Výběr (Select) si můžete zvolit ze 3 vizuálních zobrazení podle svých preferencí:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">1. Odrážka kruh</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Hotovo
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">2. Odrážka čtverec</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 shrink-0" /> V řešení
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">3. Barevné pozadí</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Čeká na schválení
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Styl štítků lze nastavit globálně pro tabulku nebo v nastavení struktury sloupců.
            </p>
          </div>
        ),
      },
      {
        id: "public-api-ai",
        category: "api",
        categoryLabel: "Veřejné API & AI Integrace",
        title: "Propojení tabulek s AI agenty (ChatGPT, Claude, n8n, Make.com)",
        summary: "Vytvoření API klíče a kompletní REST API pro automatické čtení a zápis dat.",
        icon: Sparkles,
        badge: "Pro vývojáře & AI",
        content: (
          <div className="space-y-3">
            <p>
              Foxly disponuje plnohodnotným zabezpečeným REST API, které umožňuje AI agentům (ChatGPT Custom GPTs, Claude Projects, Antigravity) i externím systémům spravovat vaše data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Vytvoření API klíče:</strong> Přejděte do <em>Nastavení firmy → Veřejné API & AI Integrace</em> a vytvořte klíč s neomezenou platností nebo expirací (30/90/365 dní).
              </li>
              <li>
                <strong>Autonomní objevování struktury:</strong> Voláním <code>GET /api/v1/workspaces/{workspaceSlug}/tables</code> AI agent automaticky zjistí všechny aplikace, tabulky a definice sloupců.
              </li>
              <li>
                <strong>Čtení záznamů:</strong> <code>GET /api/v1/tables/{'{tableId}'}/records</code> s podporou fulltext vyhledávání a stránkování.
              </li>
              <li>
                <strong>Zápis nových záznamů:</strong> <code>POST /api/v1/tables/{'{tableId}'}/records</code> s JSON tělem <code>{'{ "data": { ... } }'}</code>. Vložený záznam automaticky spouští nadefinovaná workflow pravidla.
              </li>
              <li>
                <strong>Tlačítko API v tabulce:</strong> Přímo v horní liště tabulky najdete tlačítko <strong>API</strong> s předpřipraveným cURL příkazem a ID tabulky ke zkopírování.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "ocr-invoices",
        category: "import",
        categoryLabel: "Importy & OCR Vytěžování",
        title: "Automatické OCR vytěžování faktur & Excel import",
        summary: "Jak okamžitě převést PDF fakturu nebo Excel tabulku do strukturovaných dat.",
        icon: ScanText,
        content: (
          <div className="space-y-3">
            <p>
              Nemusíte data přepisovat ručně:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>OCR Vytěžování faktur:</strong> Klikněte na tlačítko <em>Import → AI OCR Vytěžení faktury</em> a nahrajte soubor PDF nebo obrázek (JPG/PNG). AI automaticky rozpozná dodavatele, IČO, DIČ, číslo faktury, částku, variabilní symbol i data splatnosti a předvyplní řádek do tabulky.
              </li>
              <li>
                <strong>Excel (.xlsx) a CSV import:</strong> Podporuje hromadný import dat s automatickým párováním názvů sloupců a českou diakritikou (UTF-8).
              </li>
              <li>
                <strong>Záloha celé firmy do ZIP:</strong> V Nastavení firmy můžete jedním kliknutím stáhnout kompletní archiv všech tabulek ve formátu Excel i JSON.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "views-and-filters",
        category: "basics",
        categoryLabel: "Základy & Práce s tabulkou",
        title: "Uložené pohledy, filtry a zobrazení (Grid, Kanban, Kalendář)",
        summary: "Vytvářejte si vlastní filtry, řazení a přepínejte mezi vizuálními pohledy.",
        icon: TableIcon,
        content: (
          <div className="space-y-3">
            <p>
              Každý tým může pracovat s daty jinak:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Uložené pohledy:</strong> Vlevo nahoře v liště můžete své filtry, řazení, šířky sloupců a podmíněné formátování uložit jako nový pojmenovaný pohled (např. <em>&quot;Moje otevřené zakázky&quot;</em>, <em>&quot;Faktury po splatnosti&quot;</em>).
              </li>
              <li>
                <strong>Kanban nástěnka:</strong> Přepněte zobrazení na Kanban pro vizuální posouvání karet mezi stavy metodou Drag & Drop.
              </li>
              <li>
                <strong>Kalendář:</strong> Zobrazí záznamy v měsíčním kalendáři podle data splatnosti nebo realizace.
              </li>
              <li>
                <strong>Rychlé zobrazení / skrytí sloupců:</strong> Ikonou posuvníků můžete bleskově skrýt sloupce, které pro danou práci nepotřebujete.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "faq-safety",
        category: "faq",
        categoryLabel: "FAQ & Bezpečnost",
        title: "Často kladené otázky, zálohování a bezpečnost dat",
        summary: "Odpovědi na nejčastější dotazy k fungování a zabezpečení systému.",
        icon: ShieldCheck,
        content: (
          <div className="space-y-3">
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900">Jak jsou data zabezpečena?</h5>
              <p className="text-slate-600">
                Data jsou uložena v robustní databázi PostgreSQL s odděleným workspace tenant modelem. API klíče jsou šifrovány SHA-256 hashem a hesla bcryptem.
              </p>
            </div>
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900">Mohu změnit název tabulky nebo ikonu?</h5>
              <p className="text-slate-600">
                Ano, v nastavení tabulky nebo v kontextovém menu tabulky v levém menu můžete kdykoliv změnit název, popis i ikonu tabulky.
              </p>
            </div>
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900">Jak nastavit český formát data s tečkami?</h5>
              <p className="text-slate-600">
                Všechny datumové sloupce automaticky nabízejí vestavěný kalendářní picker a zobrazují datum v českém formátu (např. <code>19.11.2026</code>) s podporou bleskového zadávání.
              </p>
            </div>
          </div>
        ),
      },
    ],
    [workspaceSlug]
  );

  // Filtrování podle vyhledávání a kategorie
  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return articles.filter((art) => {
      const matchesCategory =
        selectedCategory === "all" || art.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [articles, selectedCategory, searchQuery]);

  // Vybraný aktivní článek pro detail
  const currentArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return articles.find((a) => a.id === activeArticleId) || null;
  }, [articles, activeArticleId]);

  // Odeslání zpětné vazby
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setFeedbackSending(true);
    // Simulace odeslání (nebo reálný webhook)
    await new Promise((r) => setTimeout(r, 600));
    setFeedbackSending(false);
    setFeedbackSent(true);
    setFeedbackText("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[88vh] max-h-[780px] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HORNÍ LIŠTA HLAVIČKY */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Centrum nápovědy & Průvodce systémem</span>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Dokumentace
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Všechny návody, klávesové zkratky, tipy & triky a dokumentace REST API pro AI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Zavřít nápovědu (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VYHLEDÁVÁNÍ & RYCHLÉ FILTRY KATEGORIÍ */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeArticleId) setActiveArticleId(null);
              }}
              placeholder="Hledat v nápovědě, návodech nebo zkratkách... (např. widgety, OCR faktury, API, zkratky)"
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Přepínač kategorií */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {[
              { id: "all", label: "Všechny články" },
              { id: "basics", label: "Základy & Tabulky" },
              { id: "shortcuts", label: "Klávesové zkratky" },
              { id: "widgets", label: "Widgety & Dashboard" },
              { id: "formatting", label: "Štítky & Vzhled" },
              { id: "api", label: "AI & REST API" },
              { id: "import", label: "Importy & OCR" },
              { id: "faq", label: "FAQ & Bezpečnost" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveArticleId(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer text-[11px] ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* HLAVNÍ OBSAHOVÁ OBLAST */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentArticle ? (
            /* DETAIL VYBRANÉHO ČLÁNKU */
            <div className="space-y-5 animate-in fade-in max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => setActiveArticleId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                ← Zpět na seznam témat
              </button>

              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {currentArticle.categoryLabel}
                  </span>
                  {currentArticle.badge && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {currentArticle.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{currentArticle.title}</h3>
                <p className="text-xs text-slate-500">{currentArticle.summary}</p>
              </div>

              {/* Vlastní obsah článku */}
              <div className="text-xs text-slate-700 leading-relaxed font-sans">
                {currentArticle.content}
              </div>

              {/* Rychlé odkazy podle článku */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                {currentArticle.id === "public-api-ai" && (
                  <Link
                    href={`/${workspaceSlug}/settings`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-2xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Přejít do správy API klíčů v Nastavení</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {currentArticle.id === "ocr-invoices" && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-2xs"
                  >
                    <ScanText className="w-3.5 h-3.5" />
                    <span>Zpět do tabulky vyzkoušet OCR Import</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* SEZNAM KARET TÉMAT NÁPOVĚDY */
            <div className="space-y-6">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Pro výraz &quot;{searchQuery}&quot; nebyl nalezen žádný návod
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Zkuste hledat obecnější slova jako např. &quot;zkratky&quot;, &quot;import&quot;, &quot;widgety&quot;, nebo nám pošlete dotaz níže.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Zobrazit všechny návody
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredArticles.map((art) => {
                    const IconComp = art.icon;
                    return (
                      <div
                        key={art.id}
                        onClick={() => setActiveArticleId(art.id)}
                        className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                <IconComp className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
                                {art.categoryLabel}
                              </span>
                            </div>
                            {art.badge && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                {art.badge}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {art.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {art.summary}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                          <span>Číst návod</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SEKCÍ PODPORY A DOTAZŮ */}
              <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                      <MessageSquare className="w-4 h-4" />
                      <span>Nenašli jste odpověď nebo máte nápad na vylepšení?</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Napište nám přímo sem do systému. Vaši zpětnou vazbu ihned předáme vývojovému týmu.
                    </p>
                  </div>
                </div>

                {feedbackSent ? (
                  <div className="p-3 bg-emerald-900/60 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Děkujeme! Váš dotaz byl úspěšně zaznamenán. Brzy se vám ozveme.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendFeedback} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Popište svůj dotaz nebo nápad na novou funkci..."
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={feedbackSending}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {feedbackSending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Odeslat</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SPODNÍ LIŠTA S RYCHLOU NÁPOVĚDOU A ZAVŘENÍM */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 flex items-center gap-2 text-[11px]">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Tip: Kdykoliv stiskněte klávesu <kbd className="px-1 py-0.2 bg-white border border-slate-200 rounded font-mono">?</kbd> pro otevření nápovědy.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}
