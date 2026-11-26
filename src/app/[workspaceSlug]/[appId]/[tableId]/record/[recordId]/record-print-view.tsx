"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  FileText,
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  QrCode as QrCodeIcon,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  GripVertical,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Settings2,
  Palette,
  Save,
  Plus,
  Trash2,
  LayoutTemplate,
  Sparkles,
  RotateCcw,
  Check,
  Layers,
  FileSpreadsheet,
  Package,
  Paperclip,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useDialog } from "@/components/ui/dialog-provider";

// ----------------------------------------------------------------------
// TYPY A STRUKTURY PRO A4 DRAG & DROP DESIGNER
// ----------------------------------------------------------------------

export type PrintSectionType =
  | "HEADER"
  | "DOC_INFO"
  | "PARTIES"
  | "PAYMENT_INFO"
  | "ITEMS_TABLE"
  | "FIELDS_GRID"
  | "TOTALS_QR"
  | "SIGNATURES"
  | "FOOTER_NOTE";

export interface PrintSectionConfig {
  id: string;
  type: PrintSectionType;
  title: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface PrintTemplateConfig {
  sections: PrintSectionConfig[];
  accentColor: string; // hex např. #2563eb
  fontSize: "compact" | "normal" | "spacious";
  showBorders: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  footerNote?: string;
  visibleColumnKeys?: string[];
  columnsPerRow?: number;
}

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  isPrimary?: boolean;
}

interface TableViewItem {
  id: string;
  name: string;
  type: string;
  isDefault?: boolean;
  config: Record<string, any>;
}

interface Table {
  id: string;
  name: string;
  singularName: string;
  columns: Column[];
  views?: TableViewItem[];
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  companyDetails?: Record<string, any>;
}

interface RecordData {
  id: string;
  createdAt: string | Date;
  source: string;
  data: Record<string, unknown>;
  createdBy?: { id: string; name: string; email: string } | null;
}

interface RecordPrintViewProps {
  record: RecordData;
  table: Table;
  workspace: Workspace;
  workspaceSlug: string;
  appId: string;
  tableId: string;
}

// ----------------------------------------------------------------------
// VÝCHOZÍ SESTAVY A PRESYSTÉMY
// ----------------------------------------------------------------------

const DEFAULT_INVOICE_SECTIONS: PrintSectionConfig[] = [
  { id: "sec_header", type: "HEADER", title: "Záhlaví a Logo", enabled: true },
  { id: "sec_doc_info", type: "DOC_INFO", title: "Číslo dokladu a Data", enabled: true },
  { id: "sec_parties", type: "PARTIES", title: "Dodavatel & Odběratel", enabled: true },
  { id: "sec_payment_info", type: "PAYMENT_INFO", title: "Platební podmínky a Účet", enabled: true },
  { id: "sec_items_table", type: "ITEMS_TABLE", title: "Rozpis položek / plnění", enabled: true },
  { id: "sec_totals_qr", type: "TOTALS_QR", title: "Rekapitulace DPH & SPAYD QR Platba", enabled: true },
  { id: "sec_signatures", type: "SIGNATURES", title: "Podpisy a Razítka", enabled: true },
  { id: "sec_footer", type: "FOOTER_NOTE", title: "Zápatí a právní doložka", enabled: true },
];

const DEFAULT_CARD_SECTIONS: PrintSectionConfig[] = [
  { id: "sec_header", type: "HEADER", title: "Záhlaví a Logo", enabled: true },
  { id: "sec_doc_info", type: "DOC_INFO", title: "Informace o záznamu", enabled: true },
  { id: "sec_fields_grid", type: "FIELDS_GRID", title: "Mřížka polí tabulky", enabled: true },
  { id: "sec_signatures", type: "SIGNATURES", title: "Podpisy a Razítka", enabled: true },
  { id: "sec_footer", type: "FOOTER_NOTE", title: "Zápatí", enabled: true },
];

const DEFAULT_DELIVERY_SECTIONS: PrintSectionConfig[] = [
  { id: "sec_header", type: "HEADER", title: "Záhlaví a Logo", enabled: true },
  { id: "sec_doc_info", type: "DOC_INFO", title: "Číslo protokolu a datum", enabled: true },
  { id: "sec_parties", type: "PARTIES", title: "Předávající a Přejímající", enabled: true },
  { id: "sec_fields_grid", type: "FIELDS_GRID", title: "Specifikace položek", enabled: true },
  { id: "sec_signatures", type: "SIGNATURES", title: "Předání a Převzetí (Podpisy)", enabled: true },
  { id: "sec_footer", type: "FOOTER_NOTE", title: "Doložka o předání bez vad", enabled: true },
];

const ACCENT_COLORS = [
  { name: "Firemní modrá", value: "#2563eb", bg: "bg-blue-600" },
  { name: "Smaragdová", value: "#059669", bg: "bg-emerald-600" },
  { name: "Královská fialová", value: "#7c3aed", bg: "bg-purple-600" },
  { name: "Grafitová černá", value: "#1e293b", bg: "bg-slate-800" },
  { name: "Cihlová červená", value: "#dc2626", bg: "bg-red-600" },
  { name: "Oranžová", value: "#ea580c", bg: "bg-orange-600" },
];

// ----------------------------------------------------------------------
// HLAVNÍ KOMPONENTA TISKOVÝCH SESTAV
// ----------------------------------------------------------------------

export default function RecordPrintView({
  record,
  table,
  workspace,
  workspaceSlug,
  appId,
  tableId,
}: RecordPrintViewProps) {
  const { confirm, alert } = useDialog();
  // Zjištění zda tabulka vypadá jako faktury
  const isInvoiceTable =
    table.name.toLowerCase().includes("faktur") ||
    table.columns.some(
      (c) =>
        c.key.includes("inv") ||
        c.key.includes("supplier") ||
        c.key.includes("amount") ||
        c.key.includes("ico")
    );

  // Seznam uložených tiskových šablon z databáze
  const [savedViews, setSavedViews] = useState<TableViewItem[]>(table.views || []);

  // Aktivní šablona: "INVOICE", "CARD", "DELIVERY" nebo ID uloženého pohledu
  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    // Pokud má tabulka výchozí tiskový pohled, použijeme ho
    const def = (table.views || []).find((v) => v.isDefault);
    if (def) return def.id;
    return isInvoiceTable ? "INVOICE" : "CARD";
  });

  // Režim návrháře A4 (Drag & Drop)
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Stav konfigurace aktivní sestavy
  const [config, setConfig] = useState<PrintTemplateConfig>(() => {
    return {
      sections: isInvoiceTable ? DEFAULT_INVOICE_SECTIONS : DEFAULT_CARD_SECTIONS,
      accentColor: workspace.primaryColor || "#2563eb",
      fontSize: "normal",
      showBorders: true,
      headerTitle: isInvoiceTable ? "FAKTURA – DAŇOVÝ DOKLAD" : `KARTA ZÁZNAMU: ${table.singularName.toUpperCase()}`,
      headerSubtitle: "Foxly Enterprise Management",
      footerNote: "Doklad byl vygenerován elektronicky ze systému Foxly a je platný bez razítka a podpisu dle zákona č. 235/2004 Sb.",
      visibleColumnKeys: table.columns.map((c) => c.key),
      columnsPerRow: 2,
    };
  });

  // Modal pro uložení nové šablony
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Drag and drop stav pro sekce
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Data záznamu
  const data = record.data || {};
  const company = workspace.companyDetails || {};

  // Extrakce fakturačních a klientských polí s inteligentním fallbackem
  const supplierName = String(
    data.fld_supplier || data.supplier || data.dodavatel || company.name || workspace.name
  );
  const clientName = String(
    data.fld_client ||
      data.client ||
      data.odberatel ||
      data.zakaznik ||
      (isInvoiceTable ? "Odběratel s.r.o." : "Klient")
  );

  // Deterministické číslo dokladu odvozené ze záznamu (nikdy Math.random, které způsobuje nekonečný re-render cyklus)
  const deterministicNum = useMemo(() => {
    const digits = record.id.replace(/\D/g, "");
    return (digits.slice(0, 4) || "1001").padStart(4, "0");
  }, [record.id]);

  const invNumber = useMemo(() => {
    return String(
      data.fld_inv_num ||
        data.inv_num ||
        data.cislo ||
        data.cislo_dokladu ||
        `FV-${new Date(record.createdAt).getFullYear()}/${deterministicNum}`
    );
  }, [data.fld_inv_num, data.inv_num, data.cislo, data.cislo_dokladu, record.createdAt, deterministicNum]);

  const rawAmount = Number(
    data.fld_amount ||
      data.amount ||
      data.fld_price ||
      data.price ||
      data.cena ||
      0
  );
  const amount = isNaN(rawAmount) ? 0 : rawAmount;

  const ico = String(data.fld_ico || data.ico || company.ico || "28491234");
  const dic = String(data.fld_dic || data.dic || company.dic || (ico ? `CZ${ico}` : "CZ28491234"));

  const vs = useMemo(() => {
    return String(
      data.fld_vs ||
        data.vs ||
        invNumber.replace(/\D/g, "") ||
        "20260012"
    );
  }, [data.fld_vs, data.vs, invNumber]);

  const rawDueDate = data.fld_due_date || data.due_date || data.splatnost;
  const dueDate = rawDueDate
    ? formatDate(String(rawDueDate))
    : formatDate(
        new Date(new Date(record.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000)
      );

  const issueDate = formatDate(record.createdAt);

  const bankAccount = String(
    data.fld_account || data.account || data.ucet || company.bankAccount || "2101234567 / 2010"
  );
  const iban = String(
    data.fld_iban || data.iban || company.iban || "CZ5820100000002101234567"
  );

  const itemDescription = String(
    data.fld_title ||
      data.title ||
      data.fld_note ||
      data.note ||
      data.popis ||
      `Fakturace položek dle smlouvy / objednávky ${invNumber}`
  );

  const baseWithoutVat = Math.round((amount / 1.21) * 100) / 100;
  const vatAmount = Math.round((amount - baseWithoutVat) * 100) / 100;

  // SPAYD QR Platba generování (pouze při skutečné změně platebních údajů)
  useEffect(() => {
    let isMounted = true;
    import("qrcode")
      .then((QRCode) => {
        const cleanIban = iban.replace(/\s+/g, "");
        const spaydString = `SPD*1.0*ACC:${cleanIban}*AM:${amount.toFixed(
          2
        )}*CC:CZK*X-VS:${vs}*MSG:Doklad_${invNumber.replace(/\s+/g, "_")}`;

        QRCode.toDataURL(
          spaydString,
          { width: 140, margin: 1, color: { dark: "#000000", light: "#ffffff" } },
          (err: Error | null | undefined, url: string) => {
            if (!err && isMounted && url) {
              setQrCodeUrl((prev) => (prev === url ? prev : url));
            }
          }
        );
      })
      .catch((err) => console.error("Chyba při generování QR kódu:", err));

    return () => {
      isMounted = false;
    };
  }, [iban, amount, vs, invNumber]);

  // Přepnutí přednastavené nebo uložené šablony
  const handleSelectTemplate = (id: string) => {
    setActiveTemplateId(id);
    if (id === "INVOICE") {
      setConfig({
        sections: DEFAULT_INVOICE_SECTIONS,
        accentColor: workspace.primaryColor || "#2563eb",
        fontSize: "normal",
        showBorders: true,
        headerTitle: "FAKTURA – DAŇOVÝ DOKLAD",
        headerSubtitle: "Foxly Enterprise doklad",
        footerNote: "Doklad byl vygenerován elektronicky ze systému Foxly a je platný bez razítka a podpisu dle zákona č. 235/2004 Sb.",
        visibleColumnKeys: table.columns.map((c) => c.key),
        columnsPerRow: 2,
      });
    } else if (id === "CARD") {
      setConfig({
        sections: DEFAULT_CARD_SECTIONS,
        accentColor: "#1e293b",
        fontSize: "normal",
        showBorders: true,
        headerTitle: `KARTA ZÁZNAMU: ${table.singularName.toUpperCase()}`,
        headerSubtitle: `Podrobný přehled položky evidované v aplikaci`,
        footerNote: "Vytištěno ze systému Foxly Enterprise.",
        visibleColumnKeys: table.columns.map((c) => c.key),
        columnsPerRow: 2,
      });
    } else if (id === "DELIVERY") {
      setConfig({
        sections: DEFAULT_DELIVERY_SECTIONS,
        accentColor: "#059669",
        fontSize: "normal",
        showBorders: true,
        headerTitle: "PŘEDÁVACÍ PROTOKOL / DODACÍ LIST",
        headerSubtitle: "Potvrzení o předání a převzetí předmětu plnění",
        footerNote: "Přejímající potvrzuje podpisem převzetí předmětu plnění bez zjevných vad a nedodělků.",
        visibleColumnKeys: table.columns.map((c) => c.key),
        columnsPerRow: 2,
      });
    } else {
      // Načtení z uložených šablon
      const customView = savedViews.find((v) => v.id === id);
      if (customView && customView.config) {
        const c = customView.config as unknown as PrintTemplateConfig;
        setConfig({
          sections: c.sections || DEFAULT_INVOICE_SECTIONS,
          accentColor: c.accentColor || "#2563eb",
          fontSize: c.fontSize || "normal",
          showBorders: c.showBorders !== undefined ? c.showBorders : true,
          headerTitle: c.headerTitle || "TISKOVÁ SESTAVA",
          headerSubtitle: c.headerSubtitle || "",
          footerNote: c.footerNote || "",
          visibleColumnKeys: c.visibleColumnKeys || table.columns.map((col) => col.key),
          columnsPerRow: c.columnsPerRow || 2,
        });
      }
    }
  };

  // Drag and drop handlery pro změnu pořadí sekcí
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSections = [...config.sections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedItem);

    setConfig({ ...config, sections: newSections });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Posun nahoru / dolů
  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.sections.length) return;

    const newSections = [...config.sections];
    const [item] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, item);

    setConfig({ ...config, sections: newSections });
  };

  // Zapnutí / vypnutí sekce
  const toggleSectionEnabled = (sectionId: string) => {
    setConfig({
      ...config,
      sections: config.sections.map((s) =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      ),
    });
  };

  // Uložení konfigurace do databáze (nová šablona)
  const handleSaveAsNew = async () => {
    if (!newTemplateName.trim()) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/tables/${tableId}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          config: config,
          isDefault: setAsDefault,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Uložení selhalo");
      }

      setSavedViews([...savedViews, json.view]);
      setActiveTemplateId(json.view.id);
      setIsSaveModalOpen(false);
      setNewTemplateName("");
      setStatusMessage({ text: "Šablona byla úspěšně uložena!", type: "success" });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Chyba při ukládání", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Aktualizace existující vlastní šablony
  const handleUpdateCurrent = async () => {
    if (["INVOICE", "CARD", "DELIVERY"].includes(activeTemplateId)) {
      // Nelze přepsat vestavěnou šablonu, otevřeme "Uložit jako novou"
      setNewTemplateName(`Vlastní ${activeTemplateId === "INVOICE" ? "faktura" : "sestava"}`);
      setIsSaveModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/views/${activeTemplateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSavedViews(savedViews.map((v) => (v.id === activeTemplateId ? json.view : v)));
      setStatusMessage({ text: "Změny šablony byly uloženy!", type: "success" });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Smazání vlastní šablony
  const handleDeleteTemplate = async (viewId: string) => {
    const isConfirmed = await confirm({
      title: "Smazat tiskovou šablonu?",
      message: "Opravdu si přejete smazat tuto tiskovou šablonu?",
      confirmText: "Smazat šablonu",
      variant: "danger",
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/tables/${tableId}/views/${viewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Chyba při mazání");

      setSavedViews(savedViews.filter((v) => v.id !== viewId));
      setActiveTemplateId(isInvoiceTable ? "INVOICE" : "CARD");
      handleSelectTemplate(isInvoiceTable ? "INVOICE" : "CARD");
      setStatusMessage({ text: "Šablona byla smazána.", type: "success" });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      await alert("Chyba při mazání: " + err.message);
    }
  };

  // ----------------------------------------------------------------------
  // RENDER JEDNOTLIVÝCH TISKOVÝCH BLOKŮ
  // ----------------------------------------------------------------------

  const renderSection = (section: PrintSectionConfig) => {
    if (!section.enabled) return null;

    switch (section.type) {
      // 1. ZÁHLAVÍ S LOGEM
      case "HEADER":
        return (
          <div
            key={section.id}
            className={`flex justify-between items-start border-b-2 pb-5 transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300 p-2 rounded-lg" : ""
            }`}
            style={{ borderColor: config.accentColor }}
          >
            <div className="flex items-center gap-3">
              {workspace.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workspace.logoUrl}
                  alt={workspace.name}
                  className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-lg shadow-sm"
                  style={{ backgroundColor: config.accentColor }}
                >
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 block">
                  {workspace.name}
                </span>
                <p className="text-xs text-slate-500">
                  {config.headerSubtitle || "Podnikový systém správy dokladů & účetnictví"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <h1
                className="text-2xl font-black uppercase tracking-tight"
                style={{ color: config.accentColor }}
              >
                {config.headerTitle || "TISKOVÁ SESTAVA"}
              </h1>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                Číslo: <span className="font-mono text-slate-900">{invNumber}</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Variabilní symbol: <strong>{vs}</strong>
              </div>
            </div>
          </div>
        );

      // 2. ČÍSLO DOKLADU A METADATA
      case "DOC_INFO":
        return (
          <div
            key={section.id}
            className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs print:bg-transparent transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300" : ""
            }`}
          >
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">
                Způsob úhrady
              </span>
              <span className="font-semibold text-slate-800">Bankovní převod</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">
                Datum vystavení
              </span>
              <span className="font-semibold text-slate-800">{issueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">
                DUZP / Zdanitelné plnění
              </span>
              <span className="font-semibold text-slate-800">{issueDate}</span>
            </div>
            <div
              className="p-1.5 rounded-lg border"
              style={{
                backgroundColor: `${config.accentColor}10`,
                borderColor: `${config.accentColor}40`,
              }}
            >
              <span
                className="font-bold block text-[10px] uppercase"
                style={{ color: config.accentColor }}
              >
                Datum splatnosti
              </span>
              <span className="font-bold text-slate-900 text-sm">{dueDate}</span>
            </div>
          </div>
        );

      // 3. DODAVATEL & ODBĚRATEL
      case "PARTIES":
        return (
          <div
            key={section.id}
            className={`grid grid-cols-2 gap-6 border-b border-slate-200 pb-5 transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300 p-2 rounded-lg" : ""
            }`}
          >
            {/* Dodavatel */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 print:bg-transparent">
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: config.accentColor }}
              >
                <Building2 className="w-3.5 h-3.5" /> Dodavatel
              </div>
              <div className="text-base font-bold text-slate-900 leading-snug">
                {supplierName}
              </div>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                {String(company.street || "Václavské náměstí 846/1")}<br />
                {String(company.zipCode || "110 00")} {String(company.city || "Praha 1")}, Česká republika
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-xs space-y-0.5">
                <div>
                  <strong>IČO:</strong> <span className="font-mono">{ico}</span>
                </div>
                <div>
                  <strong>DIČ:</strong> <span className="font-mono">{dic}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Plátce DPH. Zapsáno v obchodním rejstříku Městského soudu.
                </div>
              </div>
            </div>

            {/* Odběratel */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 print:bg-transparent">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Odběratel / Klient
              </div>
              <div className="text-base font-bold text-slate-900 leading-snug">
                {clientName}
              </div>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                Křižíkova 148/34<br />
                186 00 Praha 8 - Karlín, ČR
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-xs space-y-0.5">
                <div>
                  <strong>IČO:</strong> <span className="font-mono">71239845</span>
                </div>
                <div>
                  <strong>DIČ:</strong> <span className="font-mono">CZ71239845</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Konečný příjemce služeb a zboží.
                </div>
              </div>
            </div>
          </div>
        );

      // 4. PLATEBNÍ SPOJENÍ
      case "PAYMENT_INFO":
        return (
          <div
            key={section.id}
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs px-2 py-1 bg-slate-50/50 rounded-lg border border-slate-100 print:bg-transparent print:border-none ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300" : ""
            }`}
          >
            <div>
              <span className="text-slate-500">Číslo bankovního účtu:</span>{" "}
              <strong className="font-mono text-slate-900">{bankAccount}</strong>
            </div>
            <div>
              <span className="text-slate-500">Mezinárodní formát IBAN:</span>{" "}
              <strong className="font-mono text-slate-900">{iban}</strong>
            </div>
          </div>
        );

      // 5. TABULKA ROZPISU POLOŽEK
      case "ITEMS_TABLE":
        return (
          <div
            key={section.id}
            className={`border border-slate-200 rounded-xl overflow-hidden ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300" : ""
            }`}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Označení položky / Popis plnění</th>
                  <th className="py-2.5 px-3 text-center w-20">Množství</th>
                  <th className="py-2.5 px-3 text-right w-28">Cena bez DPH</th>
                  <th className="py-2.5 px-3 text-center w-16">DPH</th>
                  <th className="py-2.5 px-4 text-right w-32">Celkem s DPH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {itemDescription}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-600 font-mono">1 ks</td>
                  <td className="py-3.5 px-3 text-right text-slate-700 font-mono">
                    {formatCurrency(baseWithoutVat)}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-600 font-mono">21 %</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      // 6. MŘÍŽKA POLÍ TABULKY (PŘIZPŮSOBITELNÁ VÝBĚREM SLOUPCŮ)
      case "FIELDS_GRID":
        const activeColumns = table.columns.filter((c) =>
          (config.visibleColumnKeys || []).includes(c.key)
        );

        return (
          <div
            key={section.id}
            className={`space-y-2 transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300 p-2 rounded-lg" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-b border-slate-200 pb-1">
              <span>PODROBNÉ POLOŽKY A ATRIBUTY ({activeColumns.length})</span>
              <span className="text-[10px] font-normal text-slate-400">
                ID záznamu: {record.id.slice(0, 12)}
              </span>
            </div>

            <div
              className={`grid gap-3 ${
                config.columnsPerRow === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {activeColumns.map((col) => {
                const val = data[col.key];

                const strVal = val !== undefined && val !== null ? String(val).trim() : "";
                const isImage =
                  col.type === "IMAGE" ||
                  strVal.startsWith("data:image/") ||
                  (strVal.startsWith("http") && /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(strVal));
                const isPdf = strVal.startsWith("data:application/pdf");
                const isGenericFile =
                  col.type === "FILE" ||
                  (strVal.startsWith("data:") && !isImage && !isPdf);
                const isRawLongBase64 =
                  !isImage &&
                  !isPdf &&
                  !isGenericFile &&
                  strVal.length > 200 &&
                  !strVal.includes(" ");

                let displayValue: React.ReactNode = "-";
                if (val !== undefined && val !== null && val !== "") {
                  if (isImage) {
                    displayValue = (
                      <div className="mt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={strVal}
                          alt={col.label}
                          className="max-h-56 max-w-full rounded-md object-contain border border-slate-200 bg-white p-1 shadow-2xs"
                        />
                      </div>
                    );
                  } else if (isPdf) {
                    displayValue = (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF Příloha ({col.label})</span>
                      </div>
                    );
                  } else if (isGenericFile) {
                    displayValue = (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        <span>Příloha / Soubor</span>
                      </div>
                    );
                  } else if (isRawLongBase64) {
                    displayValue = (
                      <span className="text-slate-400 italic text-[11px]">
                        [Příloha / Binární data]
                      </span>
                    );
                  } else if (col.type === "CHECKBOX") {
                    displayValue = val ? "✅ ANO" : "❌ NE";
                  } else if (col.type === "CURRENCY") {
                    displayValue = formatCurrency(Number(val));
                  } else if (col.type === "DATE") {
                    displayValue = formatDate(String(val));
                  } else {
                    displayValue = String(val);
                  }
                }

                return (
                  <div
                    key={col.id}
                    className={`p-3 rounded-lg border border-slate-200 bg-slate-50/70 print:bg-transparent ${
                      col.type === "LONG_TEXT" || isImage ? "sm:col-span-2" : ""
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {col.label}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 break-words whitespace-pre-wrap">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      // 7. FINANČNÍ REKAPITULACE + SPAYD QR PLATBA
      case "TOTALS_QR":
        return (
          <div
            key={section.id}
            className={`grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 items-start transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300 p-2 rounded-lg" : ""
            }`}
          >
            {/* SPAYD QR Platba */}
            <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/60 print:bg-transparent">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeUrl}
                  alt="QR Platba"
                  className="w-24 h-24 border border-slate-300 rounded-lg bg-white p-1 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center shrink-0">
                  <QrCodeIcon className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="space-y-1 text-xs">
                <div
                  className="flex items-center gap-1.5 font-bold"
                  style={{ color: config.accentColor }}
                >
                  <QrCodeIcon className="w-4 h-4" />
                  <span>QR Platba SPAYD</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Naskenujte v bankovní aplikaci v mobilu pro bleskovou úhradu dokladu.
                </p>
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  Český bankovní standard SPAYD
                </div>
              </div>
            </div>

            {/* Součty a finální částka */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 pb-1">
                <span>Základ daně (21 %):</span>
                <span className="font-mono font-medium">{formatCurrency(baseWithoutVat)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 pb-1 border-b border-slate-200">
                <span>DPH 21 %:</span>
                <span className="font-mono font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              <div
                className="flex justify-between items-baseline p-3.5 rounded-xl text-white print:text-black print:border-t-2 print:border-black print:bg-transparent shadow-sm"
                style={{ backgroundColor: config.accentColor }}
              >
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  Celkem k úhradě:
                </span>
                <span className="text-xl font-black font-mono">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          </div>
        );

      // 8. PODPISOVÁ SEKCE
      case "SIGNATURES":
        return (
          <div
            key={section.id}
            className={`pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 mt-6 transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300 p-2 rounded-lg" : ""
            }`}
          >
            <div className="text-center">
              <div className="border-b border-slate-400 mb-2 pb-8"></div>
              <div className="text-xs font-semibold text-slate-600">
                Vystavil / Předal (Podpis a razítko)
              </div>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 mb-2 pb-8"></div>
              <div className="text-xs font-semibold text-slate-600">
                Převzal / Odběratel (Podpis a datum)
              </div>
            </div>
          </div>
        );

      // 9. ZÁPATÍ A PRÁVNÍ DOLOŽKA
      case "FOOTER_NOTE":
        return (
          <div
            key={section.id}
            className={`text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 transition-all ${
              isDesignerOpen ? "outline-dashed outline-1 outline-blue-300 p-1" : ""
            }`}
          >
            <p>{config.footerNote}</p>
            <div className="mt-1">
              Vygenerováno ze systému Foxly Enterprise | {workspace.name} | {formatDateTime(new Date())}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-8">
      {/* ========================================================
          1. HORNÍ OVLÁDACÍ LIŠTA (SKRYTÁ PŘI TISKU)
          ======================================================== */}
      <div className="max-w-6xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/${workspaceSlug}/${appId}/${tableId}`}
            className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zpět do tabulky {table.name}
          </Link>

          {/* Přepínač aktivní šablony */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Šablona:
            </span>
            <select
              value={activeTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="Standardní předlohy">
                <option value="INVOICE">Faktura – Daňový doklad</option>
                <option value="CARD">Karta záznamu (Detail)</option>
                <option value="DELIVERY">Předávací protokol / Dodací list</option>
              </optgroup>
              {savedViews.length > 0 && (
                <optgroup label="Moje uložené tiskové šablony">
                  {savedViews.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.isDefault ? "★ (Výchozí)" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Přepínač Drag & Drop návrháře */}
            <button
              onClick={() => setIsDesignerOpen(!isDesignerOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                isDesignerOpen
                  ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <LayoutTemplate className="w-4 h-4 text-blue-600" />
              <span>{isDesignerOpen ? "Zavřít A4 Návrhář" : "🎨 Upravit šablonu (A4 Designer)"}</span>
            </button>

            {/* Tisk tlačítko */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Vytisknout (A4)
            </button>
          </div>
        </div>

        {/* Notifikační toast */}
        {statusMessage && (
          <div
            className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* ========================================================
          2. HLAVNÍ PLOCHA: DESIGNER PANEL + A4 NÁHLED
          ======================================================== */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
        {/* LEVÝ PANEL: DRAG & DROP DESIGNER (POKUD JE ZAPNUTÝ) */}
        {isDesignerOpen && (
          <div className="w-full lg:w-80 shrink-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm no-print space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">A4 Bloky & Uspořádání</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Drag & Drop
              </span>
            </div>

            {/* Seznam bloků s možností přetahování a skrývání */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pořadí sekcí na A4:
              </div>

              {config.sections.map((section, idx) => {
                const isDragging = draggedIndex === idx;
                const isOver = dragOverIndex === idx;

                return (
                  <div
                    key={section.id}
                    draggable={true}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                      isDragging
                        ? "opacity-40 border-blue-400 bg-blue-50"
                        : isOver
                        ? "border-blue-500 bg-blue-50/50 scale-[1.02]"
                        : section.enabled
                        ? "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                        : "bg-slate-100/50 border-dashed border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {section.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Tlačítka posunu */}
                      <button
                        onClick={() => moveSection(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20"
                        title="Posunout nahoru"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveSection(idx, "down")}
                        disabled={idx === config.sections.length - 1}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20"
                        title="Posunout dolů"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Tlačítko viditelnosti */}
                      <button
                        onClick={() => toggleSectionEnabled(section.id)}
                        className={`p-1 rounded transition-colors ${
                          section.enabled
                            ? "text-blue-600 hover:bg-blue-50"
                            : "text-slate-400 hover:bg-slate-200"
                        }`}
                        title={section.enabled ? "Skrýt sekci" : "Zobrazit sekci"}
                      >
                        {section.enabled ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barevný akcent */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Barevný styl:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_COLORS.map((col) => (
                  <button
                    key={col.value}
                    onClick={() => setConfig({ ...config, accentColor: col.value })}
                    className={`w-6 h-6 rounded-full ${col.bg} transition-transform ${
                      config.accentColor === col.value
                        ? "ring-2 ring-offset-2 ring-blue-600 scale-110"
                        : "hover:scale-105"
                    }`}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* Titulek dokladu */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Vlastní titulek sestavy:
              </label>
              <input
                type="text"
                value={config.headerTitle || ""}
                onChange={(e) => setConfig({ ...config, headerTitle: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Např. FAKTURA – DAŇOVÝ DOKLAD"
              />
            </div>

            {/* Výběr sloupců tabulky (pro sekci FIELDS_GRID) */}
            {config.sections.some((s) => s.type === "FIELDS_GRID" && s.enabled) && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Zobrazované sloupce:
                  </label>
                  <button
                    onClick={() =>
                      setConfig({
                        ...config,
                        visibleColumnKeys: table.columns.map((c) => c.key),
                      })
                    }
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Všechny
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {table.columns.map((col) => {
                    const isChecked = (config.visibleColumnKeys || []).includes(col.key);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-100 p-1 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = config.visibleColumnKeys || [];
                            const updated = e.target.checked
                              ? [...cur, col.key]
                              : cur.filter((k) => k !== col.key);
                            setConfig({ ...config, visibleColumnKeys: updated });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ukládací akce */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                onClick={handleUpdateCurrent}
                disabled={isSaving}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {["INVOICE", "CARD", "DELIVERY"].includes(activeTemplateId)
                    ? "Uložit jako novou šablonu..."
                    : "Uložit změny v šabloně"}
                </span>
              </button>

              {!["INVOICE", "CARD", "DELIVERY"].includes(activeTemplateId) && (
                <button
                  onClick={() => handleDeleteTemplate(activeTemplateId)}
                  className="w-full py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Smazat tuto šablonu
                </button>
              )}
            </div>
          </div>
        )}

        {/* PRAVÁ STRANA: REÁLNÝ LIST PAPÍRU A4 */}
        <div className="flex-1 w-full flex justify-center">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-10 sm:p-14 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 space-y-6 text-slate-900 font-sans">
            {/* Vykreslení jednotlivých sekcí v pořadí zvoleném v Designeru */}
            {config.sections.map((section) => renderSection(section))}
          </div>
        </div>
      </div>

      {/* ========================================================
          3. MODAL PRO ULOŽENÍ NOVÉ ŠABLONY
          ======================================================== */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-base text-slate-900">
              Uložit jako novou tiskovou sestavu
            </h3>
            <p className="text-xs text-slate-500">
              Šablona bude uložena pro tabulku <strong>{table.name}</strong> a bude k dispozici všem kolegům.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Název šablony:</label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Např. Faktura A4 – Servisní protokol"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Nastavit jako výchozí šablonu pro tisk této tabulky</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Zrušit
              </button>
              <button
                onClick={handleSaveAsNew}
                disabled={isSaving || !newTemplateName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Ukládám..." : "Uložit šablonu"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
