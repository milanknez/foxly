# Foxly - Chytrý Firemní Intranet & No-Code Databáze (foxly.cz)

Centrální B2B SaaS platforma pro tvorbu podnikových aplikací, tabulek, tiskových protokolů, analytických dashboardů, **OCR vytěžování faktur z PDF/obrázků** a **veřejných webových formulářů pro iframe integraci** v Dockeru (**Next.js 15**, **PostgreSQL 16**, **MinIO**).

## 📖 Kompletní Technická Specifikace

Kompletní architektura, schéma multi-tenancy, vlastní domény, správa zaměstnanců, import z Excelu, OCR vytěžování faktur, tvorba formulářů pro web (iframe) a databázové schéma:
👉 **[ARCHITECTURE.md](ARCHITECTURE.md)**

## 🚀 Klíčové Pilíře Systému

1. **Přepínač Aplikací v Menu (App Switcher):**
   - V levém postranním panelu je aktivní přepínač aplikací (např. *Správa Zakázek*, *Faktury & Účetnictví*, *Skladové Hospodářství*).
   - Menu vždy striktně zobrazuje **pouze tabulky a dashboardy pro aktuálně vybranou aplikaci**.
   - Tlačítka `+ Nová aplikace` a `+ Nová tabulka` umožňují okamžité rozšiřování struktury.
2. **Pokročilé Řazení & Filtrování v Tabulce:**
   - **Řazení klikem na záhlaví:** Vzestupně (▲) / Sestupně (▼) / Původní.
   - **Fulltextové vyhledávání:** Rychlý filtr přes všechny sloupce tabulky.
   - **Filtry podle stavu:** Dropdown filtr pro výběrová pole.
   - **Dynamické patičkové agregace:** Součty (`SUM`) a průměry (`AVG`) v patičce se v reálném čase přepočítávají nad vyfiltrovanou množinou řádků!
3. **Inteligentní OCR Vytěžování Faktur (PDF & Obrázky):**
   - Tlačítko **📄 OCR Faktura (PDF/Foto)** přímo v tabulce.
   - Z PDF nebo fotografie faktury automaticky vytěží: Dodavatele, IČO, DIČ, Číslo dokladu, Variabilní symbol, Datum splatnosti, Číslo účtu a Částku celkem.
   - Vizuální náhled vytěžených dat s možností úprav před uložením do tabulky.
4. **Multi-Tenancy & Vlastní firemní domény:**
   - Striktní neprostupnost mezi firmami (Workspace).
   - Podpora subdomén (`firma.platforma.cz`) i vlastních domén (`app.firma-novak.cz`) s automatickým SSL (Caddy On-Demand TLS).
5. **Správa zaměstnanců & Granulární práva:**
   - Založení účtů, pozvánky e-mailem, přístupová práva k vybraným aplikacím a tabulkám.
6. **Veřejné Webové Formuláře (Iframe / Embed do webu):**
   - Generování `<iframe>` kódu pro vložení na web (WordPress, Webflow, Shoptet...).
   - Data od návštěvníků padají v reálném čase přímo do tabulky s ochranou proti spamu (Honeypot).
7. **Import z Excelu (.xlsx / .csv):**
   - Vytvoření nové tabulky nahráním Excelu s detekcí typů sloupců nebo doplnění dat do existující tabulky.
8. **Analytické Dashboardy & Tiskové sestavy:**
   - KPI karty s čísly, sloupcové grafy (`Recharts`) a tisk čistých A4 protokolů (`@media print`).

## 🛠️ Technologický Stack

- **Frontend & Backend:** Next.js 15 (App Router, React 19, TypeScript)
- **UI:** Tailwind CSS + shadcn/ui + Lucide Icons + Recharts
- **Data Grid:** TanStack Table v8 + TanStack Virtual (s řazením a fulltext filtry)
- **OCR Engine:** `pdf-parse` + `tesseract.js`
- **Databáze:** PostgreSQL 16 (metadata relačně + data v `JSONB` s GIN indexem)
- **ORM:** Prisma
- **Storage:** MinIO (S3 kompatibilní úložiště pro soubory a přílohy)
- **Kontejnerizace:** Docker Compose (`docker compose up -d`)
