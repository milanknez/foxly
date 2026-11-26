import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Začíná inicializace výchozích dat (seed)...");

  // 1. Vytvoření hlavního administrátora
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@foxly.local" },
    update: {},
    create: {
      email: "admin@foxly.local",
      name: "Milan Administrátor",
      passwordHash: adminPasswordHash,
      isSystemAdmin: true,
    },
  });

  // 2. Vytvoření ukázkových zaměstnanců
  const userPasswordHash = await bcrypt.hash("heslo123", 10);
  const emp1 = await prisma.user.upsert({
    where: { email: "petr@demo-firma.local" },
    update: {},
    create: {
      email: "petr@demo-firma.local",
      name: "Petr Svoboda",
      passwordHash: userPasswordHash,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: "jana@demo-firma.local" },
    update: {},
    create: {
      email: "jana@demo-firma.local",
      name: "Jana Nováková",
      passwordHash: userPasswordHash,
    },
  });

  // 3. Vytvoření firemního prostoru (Workspace)
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-firma" },
    update: {},
    create: {
      name: "Demo Firma s.r.o.",
      slug: "demo-firma",
      subdomain: "demo",
      primaryColor: "#2563eb",
      members: {
        create: [
          { userId: admin.id, role: "OWNER", jobTitle: "Jednatel" },
          { userId: emp1.id, role: "MEMBER", jobTitle: "Obchodní zástupce" },
          { userId: emp2.id, role: "MEMBER", jobTitle: "Projektová koordinátorka" },
        ],
      },
    },
  });

  // 4. Vytvoření Aplikace 1: "Správa Zakázek & CRM"
  let app1 = await prisma.app.findFirst({
    where: { workspaceId: workspace.id, name: "Správa Zakázek & CRM" },
  });

  if (!app1) {
    app1 = await prisma.app.create({
      data: {
        workspaceId: workspace.id,
        name: "Správa Zakázek & CRM",
        description: "Evidence zakázek, klientů a poptávek z webu",
        icon: "Briefcase",
        color: "#2563eb",
        sortOrder: 1,
      },
    });
  }

  // Tabulka Zakázky
  let table1 = await prisma.table.findFirst({
    where: { appId: app1.id, name: "Zakázky" },
  });

  if (!table1) {
    table1 = await prisma.table.create({
      data: {
        appId: app1.id,
        name: "Zakázky",
        singularName: "Zakázka",
        icon: "FileSpreadsheet",
        sortOrder: 1,
        columns: {
          create: [
            {
              key: "fld_title",
              label: "Název zakázky",
              type: "TEXT",
              isPrimary: true,
              isRequired: true,
              sortOrder: 1,
            },
            {
              key: "fld_client",
              label: "Zákazník",
              type: "TEXT",
              isRequired: true,
              sortOrder: 2,
            },
            {
              key: "fld_price",
              label: "Cena bez DPH",
              type: "CURRENCY",
              config: { currency: "CZK", precision: 0 },
              sortOrder: 3,
            },
            {
              key: "fld_status",
              label: "Stav",
              type: "SELECT",
              config: {
                options: [
                  { id: "opt_nova", label: "Nová poptávka", color: "#3b82f6" },
                  { id: "opt_reseni", label: "V řešení", color: "#f59e0b" },
                  { id: "opt_hotovo", label: "Hotovo", color: "#10b981" },
                  { id: "opt_fakturovano", label: "Fakturováno", color: "#8b5cf6" },
                  { id: "opt_storno", label: "Storno", color: "#ef4444" },
                ],
              },
              sortOrder: 4,
            },
            {
              key: "fld_due_date",
              label: "Termín dokončení",
              type: "DATE",
              sortOrder: 5,
            },
            {
              key: "fld_paid",
              label: "Uhrazeno",
              type: "CHECKBOX",
              sortOrder: 6,
            },
            {
              key: "fld_note",
              label: "Poznámka / Zadání",
              type: "LONG_TEXT",
              sortOrder: 7,
            },
          ],
        },
        views: {
          create: [
            {
              name: "Všechny zakázky",
              type: "GRID",
              isDefault: true,
              config: {
                footerAggregations: {
                  fld_price: "SUM",
                },
              },
            },
            {
              name: "Veřejný poptávkový formulář",
              type: "FORM",
              isPublic: true,
              shareToken: "demo-poptavka-2025",
              config: {
                title: "Nezávazná poptávka služeb",
                description: "Vyplňte krátký formulář a náš specialista se vám ozve do 24 hodin.",
                fields: ["fld_title", "fld_client", "fld_note"],
                fieldLabels: {
                  fld_title: "Stručný předmět poptávky",
                  fld_client: "Vaše jméno nebo název firmy",
                  fld_note: "Podrobnější popis zadání",
                },
                hiddenDefaults: {
                  fld_status: "Nová poptávka",
                  fld_price: 0,
                  fld_paid: false,
                },
                successMessage: "Děkujeme za odeslání poptávky! Brzy se vám ozveme.",
              },
            },
          ],
        },
      },
    });

    // Vložení ukázkových záznamů do zakázek
    await prisma.record.createMany({
      data: [
        {
          tableId: table1.id,
          createdById: admin.id,
          source: "INTERNAL",
          data: {
            fld_title: "Kompletní elektroinstalace haly A",
            fld_client: "Stavitelství Kovář a syn s.r.o.",
            fld_price: 450000,
            fld_status: "V řešení",
            fld_due_date: "2026-04-15",
            fld_paid: false,
            fld_note: "Záloha 30 % již uhrazena.",
          },
        },
        {
          tableId: table1.id,
          createdById: emp1.id,
          source: "INTERNAL",
          data: {
            fld_title: "Dodávka a montáž klimatizací",
            fld_client: "Logistické centrum Sever",
            fld_price: 185000,
            fld_status: "Hotovo",
            fld_due_date: "2026-03-01",
            fld_paid: true,
            fld_note: "Předáno včetně revizní zprávy.",
          },
        },
        {
          tableId: table1.id,
          createdById: emp1.id,
          source: "INTERNAL",
          data: {
            fld_title: "Revize a servis vzduchotechniky",
            fld_client: "Restaurace U Zlatého lva",
            fld_price: 32000,
            fld_status: "Fakturováno",
            fld_due_date: "2026-03-10",
            fld_paid: false,
            fld_note: "Splatnost faktury 14 dní.",
          },
        },
        {
          tableId: table1.id,
          createdById: null,
          source: "WEB_FORM",
          data: {
            fld_title: "Poptávka: Zabezpečení areálu kamerami",
            fld_client: "Auto-Moto Centrum Beroun",
            fld_price: 89000,
            fld_status: "Nová poptávka",
            fld_due_date: "2026-05-01",
            fld_paid: false,
            fld_note: "Zájem o 8 IP kamer se záznamem na NVR server.",
          },
        },
      ],
    });

    // Dashboard
    await prisma.dashboard.create({
      data: {
        appId: app1.id,
        name: "Manažerský Přehled Prodeje",
        description: "Klíčové ukazatele a obrat podle stavu zakázek",
        icon: "BarChart3",
        sortOrder: 1,
        widgets: {
          create: [
            {
              tableId: table1.id,
              title: "Celkový obrat zakázek",
              type: "KPI_METRIC",
              targetField: "fld_price",
              aggregation: "SUM",
              config: { currency: "CZK", prefix: "", suffix: " Kč" },
              sortOrder: 1,
            },
            {
              tableId: table1.id,
              title: "Průměrná cena zakázky",
              type: "KPI_METRIC",
              targetField: "fld_price",
              aggregation: "AVG",
              config: { currency: "CZK", prefix: "", suffix: " Kč" },
              sortOrder: 2,
            },
            {
              tableId: table1.id,
              title: "Počet aktivních zakázek",
              type: "KPI_METRIC",
              targetField: "fld_title",
              aggregation: "COUNT",
              sortOrder: 3,
            },
            {
              tableId: table1.id,
              title: "Obrat podle stavu zakázky",
              type: "BAR_CHART",
              targetField: "fld_price",
              aggregation: "SUM",
              groupField: "fld_status",
              sortOrder: 4,
            },
          ],
        },
      },
    });
  }

  // 5. Vytvoření Aplikace 2: "Faktury & Účetnictví (s OCR)"
  let app2 = await prisma.app.findFirst({
    where: { workspaceId: workspace.id, name: "Faktury & Účetnictví" },
  });

  if (!app2) {
    app2 = await prisma.app.create({
      data: {
        workspaceId: workspace.id,
        name: "Faktury & Účetnictví",
        description: "Evidence přijatých faktur s OCR vytěžováním z PDF a obrázků",
        icon: "Receipt",
        color: "#10b981",
        sortOrder: 2,
      },
    });

    // Tabulka Přijaté faktury
    const table2 = await prisma.table.create({
      data: {
        appId: app2.id,
        name: "Přijaté faktury",
        singularName: "Faktura",
        icon: "Receipt",
        sortOrder: 1,
        columns: {
          create: [
            {
              key: "fld_supplier",
              label: "Dodavatel",
              type: "TEXT",
              isPrimary: true,
              isRequired: true,
              sortOrder: 1,
            },
            {
              key: "fld_inv_num",
              label: "Číslo dokladu",
              type: "TEXT",
              isRequired: true,
              sortOrder: 2,
            },
            {
              key: "fld_ico",
              label: "IČO",
              type: "TEXT",
              sortOrder: 3,
            },
            {
              key: "fld_amount",
              label: "Částka k úhradě",
              type: "CURRENCY",
              config: { currency: "CZK", precision: 2 },
              sortOrder: 4,
            },
            {
              key: "fld_status",
              label: "Stav úhrady",
              type: "SELECT",
              config: {
                options: [
                  { id: "opt_kuhrade", label: "K úhradě", color: "#f59e0b" },
                  { id: "opt_uhrazeno", label: "Uhrazeno", color: "#10b981" },
                  { id: "opt_schvaleni", label: "Ke schválení", color: "#3b82f6" },
                  { id: "opt_posplatnosti", label: "Po splatnosti", color: "#ef4444" },
                ],
              },
              sortOrder: 5,
            },
            {
              key: "fld_due_date",
              label: "Splatnost",
              type: "DATE",
              sortOrder: 6,
            },
            {
              key: "fld_vs",
              label: "Variabilní symbol",
              type: "TEXT",
              sortOrder: 7,
            },
            {
              key: "fld_account",
              label: "Číslo účtu / IBAN",
              type: "TEXT",
              sortOrder: 8,
            },
          ],
        },
        views: {
          create: [
            {
              name: "Všechny faktury",
              type: "GRID",
              isDefault: true,
              config: {
                footerAggregations: {
                  fld_amount: "SUM",
                },
              },
            },
          ],
        },
      },
    });

    // Ukázkové faktury
    await prisma.record.createMany({
      data: [
        {
          tableId: table2.id,
          createdById: admin.id,
          source: "OCR",
          data: {
            fld_supplier: "ČEZ Prodej a.s.",
            fld_inv_num: "2026110945",
            fld_ico: "27232433",
            fld_amount: 14850.5,
            fld_status: "K úhradě",
            fld_due_date: "2026-04-20",
            fld_vs: "2026110945",
            fld_account: "123456789/0300",
          },
        },
        {
          tableId: table2.id,
          createdById: emp1.id,
          source: "OCR",
          data: {
            fld_supplier: "Alza.cz a.s.",
            fld_inv_num: "FA-9845210",
            fld_ico: "27082440",
            fld_amount: 28990.0,
            fld_status: "Uhrazeno",
            fld_due_date: "2026-03-12",
            fld_vs: "9845210",
            fld_account: "188505042/0300",
          },
        },
      ],
    });

    // Dashboard pro Faktury
    await prisma.dashboard.create({
      data: {
        appId: app2.id,
        name: "Přehled Nákladů a Faktur",
        description: "Statistika plateb dodavatelům",
        icon: "BarChart3",
        sortOrder: 1,
        widgets: {
          create: [
            {
              tableId: table2.id,
              title: "Celkem fakturováno k úhradě",
              type: "KPI_METRIC",
              targetField: "fld_amount",
              aggregation: "SUM",
              config: { currency: "CZK", suffix: " Kč" },
              sortOrder: 1,
            },
            {
              tableId: table2.id,
              title: "Počet přijatých faktur",
              type: "KPI_METRIC",
              targetField: "fld_inv_num",
              aggregation: "COUNT",
              sortOrder: 2,
            },
          ],
        },
      },
    });
  }

  // 6. Vytvoření Aplikace 3: "Skladové Hospodářství"
  let app3 = await prisma.app.findFirst({
    where: { workspaceId: workspace.id, name: "Skladové Hospodářství" },
  });

  if (!app3) {
    app3 = await prisma.app.create({
      data: {
        workspaceId: workspace.id,
        name: "Skladové Hospodářství",
        description: "Evidence zásob, materiálu a skladových položek",
        icon: "Boxes",
        color: "#f59e0b",
        sortOrder: 3,
      },
    });

    const table3 = await prisma.table.create({
      data: {
        appId: app3.id,
        name: "Skladové položky",
        singularName: "Položka",
        icon: "Boxes",
        sortOrder: 1,
        columns: {
          create: [
            {
              key: "fld_sku",
              label: "Kód / SKU",
              type: "TEXT",
              isPrimary: true,
              isRequired: true,
              sortOrder: 1,
            },
            {
              key: "fld_name",
              label: "Název materiálu",
              type: "TEXT",
              isRequired: true,
              sortOrder: 2,
            },
            {
              key: "fld_qty",
              label: "Skladem (ks)",
              type: "NUMBER",
              sortOrder: 3,
            },
            {
              key: "fld_unit_price",
              label: "Nákupní cena za kus",
              type: "CURRENCY",
              sortOrder: 4,
            },
          ],
        },
      },
    });

    await prisma.record.createMany({
      data: [
        {
          tableId: table3.id,
          data: { fld_sku: "KBL-01", fld_name: "CYKY 3x1.5 (100m)", fld_qty: 45, fld_unit_price: 1850 },
        },
        {
          tableId: table3.id,
          data: { fld_sku: "KBL-02", fld_name: "CYKY 3x2.5 (100m)", fld_qty: 32, fld_unit_price: 2450 },
        },
      ],
    });
  }

  console.log("✅ Seed úspěšně dokončen se 3 aplikacemi!");
}

main()
  .catch((e) => {
    console.error("❌ Chyba v seed skriptu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
