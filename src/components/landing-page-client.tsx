"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  ScanText,
  Key,
  ShieldCheck,
  Zap,
  Users,
  Building2,
  Table as TableIcon,
  LayoutDashboard,
  Clock,
  Check,
  Filter,
  Layers,
  Database,
  TrendingUp,
} from "lucide-react";
import FoxlyLogo, { FoxIcon } from "./foxly-logo";

export default function LandingPageClient() {
  const [activeTab, setActiveTab] = useState<"zakazky" | "faktury" | "rezervace">("zakazky");

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-orange-500 selection:text-white font-sans">
      {/* 1. HORNÍ NAVIGAČNÍ LIŠTA */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <FoxlyLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-orange-600 transition-colors">
              Funkce a výhody
            </a>
            <a href="#how-it-works" className="hover:text-orange-600 transition-colors">
              Jak chytré tabulky fungují
            </a>
            <a href="#free-access" className="hover:text-orange-600 transition-colors">
              Vše zdarma
            </a>
            <a href="#api" className="hover:text-orange-600 transition-colors">
              AI friendly a API
            </a>
          </nav>

          <div className="flex items-center gap-3 text-xs font-bold">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-700 hover:text-orange-600 hover:bg-orange-50/60 rounded-xl transition-colors"
            >
              Přihlásit se
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-600/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <span>Vyzkoušet zdarma</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SEKCÍ: CHYTRÉ TABULKY S LIŠÁKEM */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 bg-gradient-to-b from-orange-50/40 via-white to-white">
        {/* Dekorativní gradienty */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-orange-100/50 via-amber-50/40 to-rose-50/30 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Levý sloupec textu a CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold shadow-2xs">
                <span className="text-sm">🦊</span>
                <span>Chytré tabulky pro firmy, co vyrostly z Excelu</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Chytré tabulky, co mají <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
                  pořádně lišácký náskok.
                </span>
              </h1>

              <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Všechno, co máte rádi na tabulkách, ale bez chyb a zmatků. 
                Foxly spojuje <strong>evidenci zakázek</strong>, <strong>automatické vytěžování faktur přes AI</strong>, 
                <strong>webové formuláře</strong> a <strong>přehledné dashboardy</strong> do chytrého systému, 
                který si váš tým osvojí za 5 minut.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-7 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <TableIcon className="w-4 h-4" />
                  <span>Vyzkoušet chytré tabulky</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  href="/register"
                  className="w-full sm:w-auto px-7 py-4 bg-white hover:bg-orange-50/50 text-slate-800 border border-slate-300 hover:border-orange-300 rounded-xl text-sm font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>Založit účet zdarma</span>
                </Link>
              </div>

              {/* Rychlé sociální potvrzení / bullety */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Vše kompletně zdarma
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> AI čtení faktur přímo do buněk
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> V češtině a bez instalace
                </span>
              </div>
            </div>

            {/* Pravý sloupec: 3D Maskot Lišky */}
            <div id="mascot" className="lg:col-span-5 relative flex flex-col items-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/20 via-amber-300/20 to-orange-500/10 rounded-3xl blur-2xl -z-10" />

              <div className="relative w-full max-w-md bg-white/95 rounded-3xl p-5 border border-orange-100 shadow-2xl shadow-orange-950/10 backdrop-blur-sm space-y-4">
                
                {/* Obrázek lišáka */}
                <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-gradient-to-b from-orange-50 to-amber-50/50 border border-orange-100 flex items-center justify-center group">
                  <img
                    src="/fox-mascot.jpg"
                    alt="Lišák Foxly - Maskot pro chytré tabulky"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Bublina lišáka */}
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-orange-100 shadow-md text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-orange-950">
                      <span className="text-sm">🦊</span>
                      <span>Lišák Foxly radí:</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug">
                      „Netravte večery opisováním údajů z faktur a dohledáváním papírů. Naše chytré tabulky to zvládnou samy.“
                    </p>
                  </div>
                </div>

                {/* KPI mini karty pod liškou */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-100">
                    <div className="text-xl font-black text-orange-700">1 klik</div>
                    <div className="text-[10px] text-slate-500 font-medium">Import z Excelu a CSV</div>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                    <div className="text-xl font-black text-emerald-700">0 Kč</div>
                    <div className="text-[10px] text-slate-500 font-medium">100% zdarma bez poplatků</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. INTERAKTIVNÍ UKÁZKA CHYTRÉ TABULKY */}
        <div id="how-it-works" className="mt-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-2 sm:p-3 border border-slate-800 ring-1 ring-slate-800/50">
            {/* Horní okenní lišta */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-slate-400 ml-2">app.foxly.cz/chytre-tabulky</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-orange-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Živá chytrá tabulka</span>
              </div>
            </div>

            {/* Vnitřek tabulky */}
            <div className="bg-[#f8fafc] rounded-xl p-4 sm:p-6 overflow-x-auto text-slate-800 space-y-4">
              
              {/* Chytré metriky nad tabulkou */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-orange-600 text-white rounded-xl p-3.5 shadow-sm space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    Otevřené zakázky
                  </div>
                  <div className="text-2xl font-black">28</div>
                  <div className="text-[10px] opacity-80">Stav: V řešení a v přípravě</div>
                </div>

                <div className="bg-emerald-600 text-white rounded-xl p-3.5 shadow-sm space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    Celková hodnota
                  </div>
                  <div className="text-2xl font-black">245 900 Kč</div>
                  <div className="text-[10px] opacity-80">Automatický součet v reálném čase</div>
                </div>

                <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-sm space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-orange-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-400" /> AI vytěženo z PDF
                  </div>
                  <div className="text-2xl font-black text-white">12 dokladů</div>
                  <div className="text-[10px] text-slate-400">Bez ručního přepisování</div>
                </div>
              </div>

              {/* Data Grid ukázka */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <TableIcon className="w-4 h-4 text-orange-600" />
                    <span>Chytrá tabulka: Správa zakázek a klientů</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="flex items-center gap-1 text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      <Filter className="w-3 h-3 text-slate-400" /> Aktivní filtry
                    </span>
                    <span className="text-[11px] font-mono">1 240 řádků</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-3"># Kód</th>
                      <th className="py-2.5 px-3">Zákazník</th>
                      <th className="py-2.5 px-3">Předmět zakázky</th>
                      <th className="py-2.5 px-3">Částka</th>
                      <th className="py-2.5 px-3">Stav zakázky</th>
                      <th className="py-2.5 px-3">Termín</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-orange-50/40">
                      <td className="py-2 px-3 font-mono text-orange-600 font-bold">ZAK-2026-089</td>
                      <td className="py-2 px-3">Novák Elektro s.r.o.</td>
                      <td className="py-2 px-3">Kompletní elektroinstalace haly</td>
                      <td className="py-2 px-3 font-mono font-bold">145 000 Kč</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Probíhá montáž
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">28. 11. 2026</td>
                    </tr>
                    <tr className="hover:bg-orange-50/40">
                      <td className="py-2 px-3 font-mono text-orange-600 font-bold">ZAK-2026-090</td>
                      <td className="py-2 px-3">Autodíly Rychlý a syn</td>
                      <td className="py-2 px-3">Pravidelná revize a servis zdviháku</td>
                      <td className="py-2 px-3 font-mono font-bold">18 500 Kč</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Dokončeno (Protokol A4)
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">Dnes</td>
                    </tr>
                    <tr className="hover:bg-orange-50/40">
                      <td className="py-2 px-3 font-mono text-orange-600 font-bold">ZAK-2026-091</td>
                      <td className="py-2 px-3">Pivovar Řemeslník</td>
                      <td className="py-2 px-3">Dodávka nerezových ventilů</td>
                      <td className="py-2 px-3 font-mono font-bold">82 400 Kč</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Čeká na zálohu
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">02. 12. 2026</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ČÍM JSOU TABULKY VE FOXLY CHYTRÉ? */}
      <section id="features" className="py-20 bg-slate-50/70 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/80 px-2.5 py-1 rounded-full border border-orange-200">
              Chytré funkce
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Proč říkáme, že jsou naše tabulky chytré?
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Obyčejný Excel vám data jen pasivně zobrazí. Foxly tabulky data samy načítají, kontrolují a posílají dál.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Karta 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <ScanText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Samy načtou data z PDF faktur</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Přetáhněte do tabulky PDF fakturu nebo fotku dokladu. Naše AI automaticky vytáhne dodavatele, IČO, DIČ, 
                variabilní symbol, částku a datum splatnosti přímo do správných sloupců.
              </p>
            </div>

            {/* Karta 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Plní se samy z vašeho webu</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vytvořte si veřejný formulář a vložte ho na svůj web nebo e-shop. 
                Poptávka, rezervace nebo reklamace od zákazníka přistane přímo v tabulce v reálném čase.
              </p>
            </div>

            {/* Karta 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Týmová práva a vlastní doména</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Každému členu týmu nastavíte, do kterých sloupců a tabulek smí nahlížet. 
                Vše může běžet pod vaší firemní subdoménou (např. tabulky.vasedomena.cz).
              </p>
            </div>

            {/* Karta 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Import z Excelu na jedno kliknutí</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Máte stávající data v Excelu nebo CSV? Stačí soubor nahrát. 
                Foxly rozpozná datové typy a okamžitě vytvoří živou tabulku s filtry a vyhledáváním.
              </p>
            </div>

            {/* Karta 5 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dashboardy a tiskové sestavy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Z dat v tabulce máte okamžitě grafy tržeb a přehledové KPI karty. 
                Přímo z řádku tabulky vytisknete čistý předávací A4 protokol pro zákazníka.
              </p>
            </div>

            {/* Karta 6 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automatizace a napojení na AI</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Plnohodnotné REST API a webhooky. Propojte své tabulky s Make.com, n8n, 
                nebo nechte ChatGPT automaticky vyhledávat a doplňovat záznamy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VŠECHNY FUNKCE ZDARMA */}
      <section id="free-access" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/80 px-2.5 py-1 rounded-full border border-orange-200">
              Bez poplatků
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Vyzkoušejte chytré tabulky zcela zdarma
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Všechny funkce jsou vám plně k dispozici. Žádné placené brány, žádné platební karty ani skryté podmínky.
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 rounded-3xl p-8 sm:p-10 border border-orange-200 shadow-xl shadow-orange-950/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Vše otevřeno bez limitů
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  Vše, co potřebujete pro pořádek v zakázkách a fakturách
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Založte si pracovní prostor během několika vteřin. Získáte přístup ke všem funkcím včetně automatického čtení faktur přes AI, veřejných webových formulářů a dashboardů.
                </p>
                <div className="pt-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-600/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Vytvořit účet zdarma</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white rounded-2xl border border-orange-100 shadow-xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <TableIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Neomezeně tabulek</h4>
                  <p className="text-slate-500">Tvořte libovolné množství tabulek a evidencí bez omezení počtu řádků.</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-orange-100 shadow-xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <ScanText className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">AI čtení faktur</h4>
                  <p className="text-slate-500">Automatické vytěžování údajů z PDF a fotek přímo do buněk tabulky.</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-orange-100 shadow-xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Formuláře pro web</h4>
                  <p className="text-slate-500">Iframe formuláře pro sběr poptávek a rezervací přímo z vašeho webu.</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-orange-100 shadow-xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Spolupráce v týmu</h4>
                  <p className="text-slate-500">Pozvěte své kolegy a nastavte jim přesná oprávnění.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AI FRIENDLY A REST API */}
      <section id="api" className="py-20 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-950/80 px-2.5 py-1 rounded-full border border-orange-800">
              AI friendly prostředí
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Chytré tabulky, které jsou plně AI friendly
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Foxly si skvěle rozumí s moderními nástroji jako ChatGPT, Claude, Make.com nebo n8n. Pomocí jednoduchého a bezpečného API můžete nechat umělou inteligenci snadno číst data z vašich tabulek a vytvářet nové záznamy.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-orange-400" />
                  <span>Klíče s volitelnou nebo neomezenou platností</span>
                </h4>
                <p className="text-slate-400">
                  Nastavte expiraci na 30 dní, 90 dní, 1 rok, nebo vytvořte permanentní token pro systémovou integraci.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Prompt instrukce ke zkopírování na jedno kliknutí</span>
                </h4>
                <p className="text-slate-400">
                  V nastavení firmy najdete hotový systémový pokyn pro OpenAI Custom GPT nebo Claude Project, který AI přesně vysvětlí strukturu vašich tabulek.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black border border-slate-800 font-mono text-[11px] space-y-2 select-all overflow-x-auto text-slate-100">
              <div className="text-slate-500"># 1. Čtení záznamů tabulky</div>
              <div className="text-orange-400">
                curl -H "Authorization: Bearer foxly_live_..." \
              </div>
              <div className="pl-4 text-slate-300">
                https://app.foxly.cz/api/v1/tables/:tableId/records
              </div>

              <div className="text-slate-500 pt-2"># 2. Vložení nového řádku</div>
              <div className="text-amber-400">
                curl -X POST -H "Authorization: Bearer foxly_live_..." \
              </div>
              <div className="pl-4 text-slate-300">-H "Content-Type: application/json" \</div>
              <div className="pl-4 text-orange-300">
                -d &apos;&#123;&quot;data&quot;: &#123;&quot;jmeno&quot;: &quot;Jan Novák&quot;, &quot;stav&quot;: &quot;Potvrzeno&quot;&#125;&#125;&apos; \
              </div>
              <div className="pl-4 text-slate-300">
                https://app.foxly.cz/api/v1/tables/:tableId/records
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER PŘED PATIČKOU */}
      <section className="py-20 bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-bold">
            <span>🦊 Připojte se k moderním českým firmám</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Udělejte si pořádek v zakázkách a datech ještě dnes
          </h2>
          <p className="max-w-2xl mx-auto text-orange-100 text-sm sm:text-base">
            Vyzkoušejte připravenou ukázku chytrých tabulek bez registrace, nebo si založte bezplatný účet pro svůj tým.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-orange-50 text-orange-600 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Vstoupit do ukázky
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 bg-orange-950/40 hover:bg-orange-950/60 text-white border border-white/30 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            >
              Založit účet zdarma
            </Link>
          </div>
        </div>
      </section>

      {/* 8. PATIČKA */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <FoxlyLogo variant="light" size="sm" />

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">
              Přihlášení
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Registrace firmy
            </Link>
            <a href="#features" className="hover:text-white transition-colors">
              Funkce a výhody
            </a>
            <a href="#free-access" className="hover:text-white transition-colors">
              Vše zdarma
            </a>
            <a href="#api" className="hover:text-white transition-colors">
              API
            </a>
          </div>

          <div className="text-slate-500">
            &copy; {new Date().getFullYear()} Foxly. Všechna práva vyhrazena.
          </div>
        </div>
      </footer>
    </div>
  );
}
