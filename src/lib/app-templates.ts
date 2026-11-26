export interface ColumnTemplate {
  key: string;
  label: string;
  type: string;
  isPrimary?: boolean;
  isRequired?: boolean;
  config?: Record<string, any>;
}

export interface TableTemplate {
  name: string;
  singularName: string;
  icon: string;
  columns: ColumnTemplate[];
  sampleRecords: Record<string, any>[];
  publicForm?: {
    title: string;
    description: string;
    isPublic: boolean;
  };
}

export interface WidgetTemplate {
  title: string;
  type: "KPI_METRIC" | "TABLE_PREVIEW" | "BAR_CHART";
  tableIndex: number; // Index tabulky v poli tables
  targetField?: string;
  aggregation?: string;
  groupField?: string;
  config?: Record<string, any>;
}

export interface DashboardTemplate {
  name: string;
  description: string;
  widgets: WidgetTemplate[];
}

export interface AppTemplate {
  id: string;
  name: string;
  badge: string;
  category: string;
  downloads: string;
  description: string;
  color: string;
  icon: string;
  tables: TableTemplate[];
  dashboard: DashboardTemplate;
}

export const APP_TEMPLATES: AppTemplate[] = [
  // 1. CRM
  {
    id: "crm",
    name: "CRM Platinum",
    badge: "Zdarma",
    category: "Prodej & Obchod",
    downloads: "4.8k",
    color: "#2563eb",
    icon: "Briefcase",
    description:
      "Ucelený nástroj pro přehledné řízení obchodních případů, kontaktů i objednávek. Umožňuje firmám snadno sledovat prodejní fáze, hodnotu zakázek a pipeline.",
    tables: [
      {
        name: "Obchodní případy",
        singularName: "Obchodní případ",
        icon: "Briefcase",
        columns: [
          { key: "fld_nazev", label: "Název zakázky", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_klient", label: "Zákazník / Firma", type: "TEXT", isRequired: true },
          { key: "fld_castka", label: "Hodnota zakázky", type: "CURRENCY" },
          {
            key: "fld_faze",
            label: "Fáze obchodu",
            type: "SELECT",
            config: { options: ["Nový kontakt", "Nabídka odeslána", "Vyjednávání", "Vyhráno", "Ztraceno"] },
          },
          { key: "fld_pravdepodobnost", label: "Pravděpodobnost (%)", type: "NUMBER" },
          { key: "fld_datum_uzavreni", label: "Předpokládané uzavření", type: "DATE" },
          { key: "fld_zodpovedny", label: "Obchodník", type: "TEXT" },
        ],
        sampleRecords: [
          {
            fld_nazev: "Implementace ERP systému",
            fld_klient: "Alfa Logistics s.r.o.",
            fld_castka: 185000,
            fld_faze: "Vyjednávání",
            fld_pravdepodobnost: 80,
            fld_datum_uzavreni: "2026-12-15",
            fld_zodpovedny: "Petr Svoboda",
          },
          {
            fld_nazev: "Dodávka IT techniky & notebooků",
            fld_klient: "Beta Stavby a.s.",
            fld_castka: 92000,
            fld_faze: "Nabídka odeslána",
            fld_pravdepodobnost: 60,
            fld_datum_uzavreni: "2026-11-30",
            fld_zodpovedny: "Jana Nováková",
          },
          {
            fld_nazev: "Roční servisní smlouva",
            fld_klient: "Gamma Retail s.r.o.",
            fld_castka: 240000,
            fld_faze: "Vyhráno",
            fld_pravdepodobnost: 100,
            fld_datum_uzavreni: "2026-11-20",
            fld_zodpovedny: "Petr Svoboda",
          },
        ],
      },
      {
        name: "Kontakty & Klienti",
        singularName: "Kontakt",
        icon: "Users",
        columns: [
          { key: "fld_nazev", label: "Název firmy / Jméno", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_ico", label: "IČO", type: "TEXT" },
          { key: "fld_email", label: "E-mail", type: "EMAIL" },
          { key: "fld_telefon", label: "Telefon", type: "PHONE" },
          { key: "fld_mesto", label: "Město", type: "TEXT" },
          {
            key: "fld_typ",
            label: "Typ klienta",
            type: "SELECT",
            config: { options: ["Stálý zákazník", "Potenciální klient", "Dodavatel", "Partner"] },
          },
        ],
        sampleRecords: [
          {
            fld_nazev: "Alfa Logistics s.r.o.",
            fld_ico: "28475819",
            fld_email: "obchod@alfalog.cz",
            fld_telefon: "+420 777 123 456",
            fld_mesto: "Praha",
            fld_typ: "Stálý zákazník",
          },
          {
            fld_nazev: "Beta Stavby a.s.",
            fld_ico: "19482014",
            fld_email: "info@betastavby.cz",
            fld_telefon: "+420 608 987 654",
            fld_mesto: "Brno",
            fld_typ: "Potenciální klient",
          },
          {
            fld_nazev: "Gamma Retail s.r.o.",
            fld_ico: "83910284",
            fld_email: "nakup@gammaretail.cz",
            fld_telefon: "+420 724 333 222",
            fld_mesto: "Ostrava",
            fld_typ: "Stálý zákazník",
          },
        ],
      },
      {
        name: "Objednávky",
        singularName: "Objednávka",
        icon: "Receipt",
        columns: [
          { key: "fld_cislo", label: "Číslo objednávky", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_zakaznik", label: "Zákazník", type: "TEXT", isRequired: true },
          { key: "fld_celkem", label: "Celková částka", type: "CURRENCY" },
          {
            key: "fld_stav",
            label: "Stav objednávky",
            type: "SELECT",
            config: { options: ["Přijatá", "Ve zpracování", "Odesláno", "Fakturováno", "Storno"] },
          },
          { key: "fld_datum", label: "Datum vystavení", type: "DATE" },
        ],
        sampleRecords: [
          {
            fld_cislo: "OBJ-2026-001",
            fld_zakaznik: "Gamma Retail s.r.o.",
            fld_celkem: 65000,
            fld_stav: "Fakturováno",
            fld_datum: "2026-11-18",
          },
          {
            fld_cislo: "OBJ-2026-002",
            fld_zakaznik: "Alfa Logistics s.r.o.",
            fld_celkem: 48000,
            fld_stav: "Ve zpracování",
            fld_datum: "2026-11-21",
          },
        ],
      },
    ],
    dashboard: {
      name: "Manažerský CRM Přehled",
      description: "Pipeline obchodních případů, hodnoty a největší otevřené obchody",
      widgets: [
        {
          title: "Celková hodnota otevřených zakázek",
          type: "KPI_METRIC",
          tableIndex: 0,
          targetField: "fld_castka",
          aggregation: "SUM",
          config: { currency: true, color: "blue" },
        },
        {
          title: "Počet obchodních případů",
          type: "KPI_METRIC",
          tableIndex: 0,
          aggregation: "COUNT",
          config: { color: "indigo" },
        },
        {
          title: "Počet evidovaných klientů",
          type: "KPI_METRIC",
          tableIndex: 1,
          aggregation: "COUNT",
          config: { color: "emerald" },
        },
        {
          title: "TOP největší zakázky",
          type: "TABLE_PREVIEW",
          tableIndex: 0,
          targetField: "fld_castka",
          aggregation: "COUNT",
          config: { limit: 5, sortDirection: "desc", selectedColumns: ["fld_nazev", "fld_klient", "fld_castka", "fld_faze"] },
        },
      ],
    },
  },

  // 2. HELPDESK
  {
    id: "helpdesk",
    name: "Helpdesk & Tikety",
    badge: "Populární",
    category: "Zákaznická podpora",
    downloads: "3.2k",
    color: "#7c3aed",
    icon: "LifeBuoy",
    description:
      "Evidence požadavků, hlášení chyb a tiketů podpory. Umožňuje sledovat priority, přidělené řešitele, termíny SLA a stavy řešení od zadání po uzavření.",
    tables: [
      {
        name: "Požadavky a tikety",
        singularName: "Tiket",
        icon: "FileSpreadsheet",
        columns: [
          { key: "fld_predmet", label: "Předmět požadavku", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_klient", label: "Klient / Žadatel", type: "TEXT", isRequired: true },
          {
            key: "fld_priorita",
            label: "Priorita",
            type: "SELECT",
            config: { options: ["Nízká", "Normální", "Vysoká", "Kritická (SLA 4h)"] },
          },
          {
            key: "fld_stav",
            label: "Stav tiketu",
            type: "SELECT",
            config: { options: ["Nový", "V řešení", "Čeká na reakci klienta", "Vyřešeno", "Uzavřeno"] },
          },
          {
            key: "fld_kategorie",
            label: "Kategorie",
            type: "SELECT",
            config: { options: ["Technická chyba", "Dotaz na nastavení", "Fakturační dotaz", "Změnový požadavek"] },
          },
          { key: "fld_resitel", label: "Přidělený technik", type: "TEXT" },
          { key: "fld_datum", label: "Datum nahlášení", type: "DATE" },
        ],
        sampleRecords: [
          {
            fld_predmet: "Nefunkční synchronizace skladových zásob",
            fld_klient: "Alfa Logistics s.r.o.",
            fld_priorita: "Kritická (SLA 4h)",
            fld_stav: "V řešení",
            fld_kategorie: "Technická chyba",
            fld_resitel: "Milan Administrátor",
            fld_datum: "2026-11-22",
          },
          {
            fld_predmet: "Dotaz k nastavení DPH na faktuře",
            fld_klient: "Gamma Retail s.r.o.",
            fld_priorita: "Normální",
            fld_stav: "Nový",
            fld_kategorie: "Fakturační dotaz",
            fld_resitel: "Jana Nováková",
            fld_datum: "2026-11-21",
          },
          {
            fld_predmet: "Žádost o vytvoření nového uživatelského účtu",
            fld_klient: "Beta Stavby a.s.",
            fld_priorita: "Nízká",
            fld_stav: "Vyřešeno",
            fld_kategorie: "Dotaz na nastavení",
            fld_resitel: "Petr Svoboda",
            fld_datum: "2026-11-19",
          },
        ],
      },
      {
        name: "Znalostní báze (FAQ)",
        singularName: "Návod",
        icon: "FileText",
        columns: [
          { key: "fld_nazev", label: "Otázka / Název návodu", type: "TEXT", isPrimary: true, isRequired: true },
          {
            key: "fld_kategorie",
            label: "Sekce",
            type: "SELECT",
            config: { options: ["Přihlášení a hesla", "Exporty a tisk", "Uživatelská práva", "API a integrace"] },
          },
          { key: "fld_reseni", label: "Postup a řešení", type: "LONG_TEXT" },
        ],
        sampleRecords: [
          {
            fld_nazev: "Jak obnovit zapomenuté heslo?",
            fld_kategorie: "Přihlášení a hesla",
            fld_reseni: "V přihlašovacím okně klikněte na odkaz 'Zapomněli jste heslo' a zadejte svůj registrační email.",
          },
          {
            fld_nazev: "Kde najdu tiskové sestavy a export do PDF?",
            fld_kategorie: "Exporty a tisk",
            fld_reseni: "V detailu libovolného záznamu klikněte na tlačítko Tisk (ikona tiskárny v pravém horním rohu).",
          },
        ],
      },
    ],
    dashboard: {
      name: "Helpdesk Monitoring",
      description: "Přehled otevřených tiketů, priorit a technické podpory",
      widgets: [
        {
          title: "Počet aktivních tiketů",
          type: "KPI_METRIC",
          tableIndex: 0,
          aggregation: "COUNT",
          config: { color: "rose" },
        },
        {
          title: "Články v nápovědě",
          type: "KPI_METRIC",
          tableIndex: 1,
          aggregation: "COUNT",
          config: { color: "indigo" },
        },
        {
          title: "Poslední nahlášené požadavky",
          type: "TABLE_PREVIEW",
          tableIndex: 0,
          targetField: "fld_datum",
          aggregation: "COUNT",
          config: { limit: 5, sortDirection: "desc", selectedColumns: ["fld_predmet", "fld_klient", "fld_priorita", "fld_stav"] },
        },
      ],
    },
  },

  // 3. TASK A PROJEKT MANAŽER
  {
    id: "tasks",
    name: "Task & Projekt Manažer",
    badge: "Doporučeno",
    category: "Řízení projektů",
    downloads: "5.1k",
    color: "#059669",
    icon: "CheckSquare",
    description:
      "Strukturované sledování firemních projektů, milníků a dílčích úkolů. Plánujte termíny (deadline), rozpočty a sledujte plnění v reálném čase.",
    tables: [
      {
        name: "Projekty",
        singularName: "Projekt",
        icon: "Briefcase",
        columns: [
          { key: "fld_nazev", label: "Název projektu", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_klient", label: "Zadavatel / Klient", type: "TEXT" },
          {
            key: "fld_stav",
            label: "Stav projektu",
            type: "SELECT",
            config: { options: ["Plánování", "V realizaci", "Pozastaveno", "Dokončeno"] },
          },
          { key: "fld_rozpocet", label: "Rozpočet projektu", type: "CURRENCY" },
          { key: "fld_termin", label: "Termín dokončení", type: "DATE" },
          { key: "fld_vedouci", label: "Projektový manažer", type: "TEXT" },
        ],
        sampleRecords: [
          {
            fld_nazev: "Redesign firemního webu & e-shop",
            fld_klient: "Interní projekt",
            fld_stav: "V realizaci",
            fld_rozpocet: 120000,
            fld_termin: "2026-12-20",
            fld_vedouci: "Jana Nováková",
          },
          {
            fld_nazev: "Vývoj mobilní aplikace pro řidiče",
            fld_klient: "Alfa Logistics s.r.o.",
            fld_stav: "Plánování",
            fld_rozpocet: 340000,
            fld_termin: "2027-02-28",
            fld_vedouci: "Milan Administrátor",
          },
        ],
      },
      {
        name: "Úkoly (Tasks)",
        singularName: "Úkol",
        icon: "Table",
        columns: [
          { key: "fld_nazev", label: "Název úkolu", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_projekt", label: "Projekt", type: "TEXT", isRequired: true },
          {
            key: "fld_stav",
            label: "Stav úkolu",
            type: "SELECT",
            config: { options: ["K řešení", "V procesu", "Ke schválení", "Hotovo"] },
          },
          {
            key: "fld_priorita",
            label: "Priorita",
            type: "SELECT",
            config: { options: ["Nízká", "Střední", "Vysoká", "Urgentní"] },
          },
          { key: "fld_odhad_hodin", label: "Odhad hodin", type: "NUMBER" },
          { key: "fld_deadline", label: "Termín (Deadline)", type: "DATE" },
          { key: "fld_resitel", label: "Přiřazeno", type: "TEXT" },
        ],
        sampleRecords: [
          {
            fld_nazev: "Příprava grafických podkladů a wireframe",
            fld_projekt: "Redesign firemního webu & e-shop",
            fld_stav: "V procesu",
            fld_priorita: "Vysoká",
            fld_odhad_hodin: 16,
            fld_deadline: "2026-11-28",
            fld_resitel: "Jana Nováková",
          },
          {
            fld_nazev: "Návrh databázového schématu a API specifikace",
            fld_projekt: "Vývoj mobilní aplikace pro řidiče",
            fld_stav: "K řešení",
            fld_priorita: "Urgentní",
            fld_odhad_hodin: 24,
            fld_deadline: "2026-12-05",
            fld_resitel: "Petr Svoboda",
          },
          {
            fld_nazev: "Testování responzivity v mobilních prohlížečích",
            fld_projekt: "Redesign firemního webu & e-shop",
            fld_stav: "K řešení",
            fld_priorita: "Střední",
            fld_odhad_hodin: 8,
            fld_deadline: "2026-12-10",
            fld_resitel: "Milan Administrátor",
          },
        ],
      },
    ],
    dashboard: {
      name: "Projektový Dashboard",
      description: "Plnění rozpočtů, aktivní úkoly a nejbližší milníky",
      widgets: [
        {
          title: "Celkový rozpočet projektů",
          type: "KPI_METRIC",
          tableIndex: 0,
          targetField: "fld_rozpocet",
          aggregation: "SUM",
          config: { currency: true, color: "emerald" },
        },
        {
          title: "Počet aktivních úkolů",
          type: "KPI_METRIC",
          tableIndex: 1,
          aggregation: "COUNT",
          config: { color: "blue" },
        },
        {
          title: "Úkoly s nejbližším termínem",
          type: "TABLE_PREVIEW",
          tableIndex: 1,
          targetField: "fld_deadline",
          aggregation: "COUNT",
          config: { limit: 5, sortDirection: "asc", selectedColumns: ["fld_nazev", "fld_projekt", "fld_resitel", "fld_deadline", "fld_stav"] },
        },
      ],
    },
  },

  // 4. SPRÁVA MAJETKU
  {
    id: "assets",
    name: "Správa majetku & Inventář",
    badge: "Praktické",
    category: "Provoz & Majetek",
    downloads: "2.7k",
    color: "#d97706",
    icon: "Boxes",
    description:
      "Kompletní evidence hmotného i nehmotného majetku, IT techniky, kancelářského vybavení a vozidel. Sledujte inventární čísla, odpovědné osoby a záruky.",
    tables: [
      {
        name: "Evidence majetku",
        singularName: "Položka majetku",
        icon: "Boxes",
        columns: [
          { key: "fld_nazev", label: "Název zařízení / Model", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_inv_cislo", label: "Inventární číslo", type: "TEXT", isRequired: true },
          {
            key: "fld_kategorie",
            label: "Kategorie majetku",
            type: "SELECT",
            config: { options: ["IT Technika & PC", "Kancelářský nábytek", "Nářadí a stroje", "Služební vozidla", "Mobilní telefony"] },
          },
          {
            key: "fld_stav",
            label: "Stav",
            type: "SELECT",
            config: { options: ["V provozu", "Na skladě", "V opravě / Servis", "Vyřazeno"] },
          },
          { key: "fld_zodpovedny", label: "Zodpovědná osoba", type: "TEXT" },
          { key: "fld_cena", label: "Pořizovací cena", type: "CURRENCY" },
          { key: "fld_datum_porizeni", label: "Datum pořízení", type: "DATE" },
          { key: "fld_zaruka", label: "Záruka do", type: "DATE" },
        ],
        sampleRecords: [
          {
            fld_nazev: "Notebook Lenovo ThinkPad X1 Carbon",
            fld_inv_cislo: "INV-2025-042",
            fld_kategorie: "IT Technika & PC",
            fld_stav: "V provozu",
            fld_zodpovedny: "Milan Administrátor",
            fld_cena: 48500,
            fld_datum_porizeni: "2025-06-10",
            fld_zaruka: "2028-06-10",
          },
          {
            fld_nazev: "Ergonomická židle Herman Miller Aeron",
            fld_inv_cislo: "INV-2025-018",
            fld_kategorie: "Kancelářský nábytek",
            fld_stav: "V provozu",
            fld_zodpovedny: "Jana Nováková",
            fld_cena: 32000,
            fld_datum_porizeni: "2025-03-15",
            fld_zaruka: "2030-03-15",
          },
          {
            fld_nazev: "Osobní automobil Škoda Octavia Combi",
            fld_inv_cislo: "INV-2024-001",
            fld_kategorie: "Služební vozidla",
            fld_stav: "V provozu",
            fld_zodpovedny: "Petr Svoboda",
            fld_cena: 680000,
            fld_datum_porizeni: "2024-04-01",
            fld_zaruka: "2029-04-01",
          },
        ],
      },
      {
        name: "Servis a revize",
        singularName: "Servisní záznam",
        icon: "FileText",
        columns: [
          { key: "fld_zarizeni", label: "Zařízení", type: "TEXT", isPrimary: true, isRequired: true },
          {
            key: "fld_typ_servisu",
            label: "Druh kontroly",
            type: "SELECT",
            config: { options: ["Pravidelná revize", "Oprava závady", "Záruční servis", "Výměna komponent"] },
          },
          { key: "fld_naklady", label: "Náklady servisu", type: "CURRENCY" },
          { key: "fld_datum_servisu", label: "Datum zásahu", type: "DATE" },
          { key: "fld_dodavatel", label: "Servisní středisko", type: "TEXT" },
        ],
        sampleRecords: [
          {
            fld_zarizeni: "Škoda Octavia Combi (INV-2024-001)",
            fld_typ_servisu: "Pravidelná revize",
            fld_naklady: 8500,
            fld_datum_servisu: "2026-10-14",
            fld_dodavatel: "Auto Heller s.r.o.",
          },
        ],
      },
    ],
    dashboard: {
      name: "Inventární Nástěnka",
      description: "Finanční hodnota firemního majetku a stav zařízení",
      widgets: [
        {
          title: "Celková hodnota majetku",
          type: "KPI_METRIC",
          tableIndex: 0,
          targetField: "fld_cena",
          aggregation: "SUM",
          config: { currency: true, color: "amber" },
        },
        {
          title: "Počet položek v inventáři",
          type: "KPI_METRIC",
          tableIndex: 0,
          aggregation: "COUNT",
          config: { color: "blue" },
        },
        {
          title: "Položky s nejvyšší hodnotou",
          type: "TABLE_PREVIEW",
          tableIndex: 0,
          targetField: "fld_cena",
          aggregation: "COUNT",
          config: { limit: 5, sortDirection: "desc", selectedColumns: ["fld_nazev", "fld_inv_cislo", "fld_cena", "fld_zodpovedny", "fld_stav"] },
        },
      ],
    },
  },
  // 5. REZERVAČNÍ SYSTÉM (Restaurace, Kadeřnictví, Služby)
  {
    id: "reservations",
    name: "Rezervační systém & Objednávky",
    badge: "Formulář online",
    category: "Gastronomie & Služby",
    downloads: "5.4k",
    color: "#059669",
    icon: "Calendar",
    description:
      "Kompletní rezervační systém pro restaurace, kadeřnictví, salóny a wellness. Obsahuje automaticky aktivovaný veřejný webový formulář pro online rezervace hostů z vašeho webu a přehledný kalendář.",
    tables: [
      {
        name: "Rezervace & Termíny",
        singularName: "Rezervace",
        icon: "Calendar",
        publicForm: {
          title: "Online rezervace stolu & termínu",
          description: "Vyberte si prosím požadovaný termín, čas a službu. Naše obsluha vaši rezervaci obratem potvrdí.",
          isPublic: true,
        },
        columns: [
          { key: "fld_jmeno", label: "Jméno a Příjmení", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_telefon", label: "Telefonní číslo", type: "TEXT", isRequired: true },
          { key: "fld_email", label: "E-mail klienta", type: "EMAIL" },
          {
            key: "fld_sluzba",
            label: "Služba / Rezervovaný stůl",
            type: "SELECT",
            isRequired: true,
            config: {
              options: [
                "Stůl pro 2 osoby (Večeře)",
                "Stůl pro 4 osoby (Oběd / Večeře)",
                "Salónek / Oslava (8+ osob)",
                "Dámský střih & Foukání",
                "Pánský střih & Úprava vousů",
                "Barvení & Kompletní péče",
                "Masáž & Wellness balíček",
              ],
            },
          },
          { key: "fld_datum", label: "Datum rezervace", type: "DATE", isRequired: true },
          {
            key: "fld_cas",
            label: "Čas rezervace",
            type: "SELECT",
            isRequired: true,
            config: {
              options: ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"],
            },
          },
          { key: "fld_pocet_osob", label: "Počet osob / hostů", type: "NUMBER" },
          {
            key: "fld_stav",
            label: "Stav rezervace",
            type: "SELECT",
            config: {
              options: ["Nová rezervace (z webu)", "Potvrzeno obsluhou", "Zákazník usazen / Probíhá", "Dokončeno", "Zrušeno"],
            },
          },
          { key: "fld_cena", label: "Předpokládaná útrata", type: "CURRENCY" },
          { key: "fld_poznamka", label: "Poznámka / Alergie / Přání", type: "TEXT" },
        ],
        sampleRecords: [
          {
            fld_jmeno: "Ing. Tomáš Dvořák",
            fld_telefon: "+420 777 123 456",
            fld_email: "tomas.dvorak@email.cz",
            fld_sluzba: "Stůl pro 4 osoby (Oběd / Večeře)",
            fld_datum: "2026-11-25",
            fld_cas: "19:00",
            fld_pocet_osob: 4,
            fld_stav: "Potvrzeno obsluhou",
            fld_cena: 3200,
            fld_poznamka: "Stůl u okna, výročí svatby, připravit prosecco",
          },
          {
            fld_jmeno: "Lucie Králová",
            fld_telefon: "+420 608 987 654",
            fld_email: "lucie.kralova@seznam.cz",
            fld_sluzba: "Barvení & Kompletní péče",
            fld_datum: "2026-11-26",
            fld_cas: "13:00",
            fld_pocet_osob: 1,
            fld_stav: "Potvrzeno obsluhou",
            fld_cena: 1890,
            fld_poznamka: "Přeliv studená blond a regenerační kúra",
          },
          {
            fld_jmeno: "Martin Veselý",
            fld_telefon: "+420 732 456 789",
            fld_email: "martin.vesely@gmail.com",
            fld_sluzba: "Pánský střih & Úprava vousů",
            fld_datum: "2026-11-27",
            fld_cas: "16:00",
            fld_pocet_osob: 1,
            fld_stav: "Nová rezervace (z webu)",
            fld_cena: 690,
            fld_poznamka: "Poprvé u nás",
          },
          {
            fld_jmeno: "Rodina Horáková",
            fld_telefon: "+420 724 112 334",
            fld_email: "horakova.jana@centrum.cz",
            fld_sluzba: "Salónek / Oslava (8+ osob)",
            fld_datum: "2026-12-05",
            fld_cas: "17:30",
            fld_pocet_osob: 10,
            fld_stav: "Potvrzeno obsluhou",
            fld_cena: 12500,
            fld_poznamka: "Narozeninová oslava 50 let, dětská židlička 1x",
          },
          {
            fld_jmeno: "Karolína Černá",
            fld_telefon: "+420 775 889 900",
            fld_email: "karolina.cerna@post.cz",
            fld_sluzba: "Stůl pro 2 osoby (Večeře)",
            fld_datum: "2026-11-24",
            fld_cas: "20:30",
            fld_pocet_osob: 2,
            fld_stav: "Zákazník usazen / Probíhá",
            fld_cena: 1950,
            fld_poznamka: "Bezlepková dieta",
          },
        ],
      },
      {
        name: "Služby & Kapacity",
        singularName: "Služba / Stůl",
        icon: "Scissors",
        columns: [
          { key: "fld_nazev_polozky", label: "Název služby / Stolu", type: "TEXT", isPrimary: true, isRequired: true },
          {
            key: "fld_typ_provozu",
            label: "Kategorie",
            type: "SELECT",
            config: { options: ["Gastronomie & Stoly", "Kadeřnictví & Vlasy", "Masáže & Péče"] },
          },
          { key: "fld_delka_minuty", label: "Doba trvání (minuty)", type: "NUMBER" },
          { key: "fld_zakladni_cena", label: "Základní cena / Kauce", type: "CURRENCY" },
          { key: "fld_kapacita", label: "Max. kapacita osob", type: "NUMBER" },
          { key: "fld_aktivni", label: "Aktivní v nabídce", type: "CHECKBOX" },
        ],
        sampleRecords: [
          {
            fld_nazev_polozky: "Stůl 1-4 (Hlavní sál)",
            fld_typ_provozu: "Gastronomie & Stoly",
            fld_delka_minuty: 120,
            fld_zakladni_cena: 0,
            fld_kapacita: 4,
            fld_aktivni: true,
          },
          {
            fld_nazev_polozky: "Salónek VIP",
            fld_typ_provozu: "Gastronomie & Stoly",
            fld_delka_minuty: 240,
            fld_zakladni_cena: 2000,
            fld_kapacita: 14,
            fld_aktivni: true,
          },
          {
            fld_nazev_polozky: "Dámský střih & Foukání",
            fld_typ_provozu: "Kadeřnictví & Vlasy",
            fld_delka_minuty: 60,
            fld_zakladni_cena: 950,
            fld_kapacita: 1,
            fld_aktivni: true,
          },
          {
            fld_nazev_polozky: "Barvení & Balayage",
            fld_typ_provozu: "Kadeřnictví & Vlasy",
            fld_delka_minuty: 150,
            fld_zakladni_cena: 2400,
            fld_kapacita: 1,
            fld_aktivni: true,
          },
        ],
      },
      {
        name: "Stálí hosté & Klienti",
        singularName: "Klient",
        icon: "Users",
        columns: [
          { key: "fld_jmeno_klienta", label: "Jméno hosta", type: "TEXT", isPrimary: true, isRequired: true },
          { key: "fld_telefon_klienta", label: "Telefon", type: "TEXT" },
          { key: "fld_email_klienta", label: "E-mail", type: "EMAIL" },
          { key: "fld_pocet_navstev", label: "Počet návštěv", type: "NUMBER" },
          { key: "fld_vip", label: "VIP stálý klient", type: "CHECKBOX" },
          { key: "fld_poznamky_klient", label: "Oblíbené preference", type: "TEXT" },
        ],
        sampleRecords: [
          {
            fld_jmeno_klienta: "Ing. Tomáš Dvořák",
            fld_telefon_klienta: "+420 777 123 456",
            fld_email_klienta: "tomas.dvorak@email.cz",
            fld_pocet_navstev: 12,
            fld_vip: true,
            fld_poznamky_klient: "Preferuje červená vína z Moravy, stůl u okna",
          },
          {
            fld_jmeno_klienta: "Lucie Králová",
            fld_telefon_klienta: "+420 608 987 654",
            fld_email_klienta: "lucie.kralova@seznam.cz",
            fld_pocet_navstev: 6,
            fld_vip: false,
            fld_poznamky_klient: "Káva cappuccino s ovesným mlékem",
          },
        ],
      },
    ],
    dashboard: {
      name: "Přehled rezervací",
      description: "Ukazatele obsazenosti, nových online rezervací z webového formuláře a tržeb",
      widgets: [
        {
          title: "Všechny rezervace",
          type: "KPI_METRIC",
          tableIndex: 0,
          aggregation: "COUNT",
        },
        {
          title: "Tržby z rezervací",
          type: "KPI_METRIC",
          tableIndex: 0,
          targetField: "fld_cena",
          aggregation: "SUM",
        },
        {
          title: "Rezervace podle služby",
          type: "BAR_CHART",
          tableIndex: 0,
          groupField: "fld_sluzba",
          aggregation: "COUNT",
        },
        {
          title: "Nejnovější rezervace",
          type: "TABLE_PREVIEW",
          tableIndex: 0,
        },
      ],
    },
  },
];
