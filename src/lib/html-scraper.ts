/**
 * Pokročilý HTML Scraper a extraktor strukturovaných dat pro Foxly Enterprise
 * Podporuje:
 * 1. JSON-LD Schema.org (Google JobPosting, Product, Article)
 * 2. HTML karty a opakující se kontejnery (pracovní nabídky, inzeráty, produkty)
 * 3. JSON REST API endpointy (např. pracovní portály s otevřeným API)
 * 4. HTML tabulky (<table> <tr> <td>)
 */

export interface ScrapedItem {
  [key: string]: any;
}

// Bezpečný převod relativní URL na absolutní
function resolveUrl(urlStr: string, baseUrl?: string): string {
  if (!urlStr) return "";
  try {
    if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
      return urlStr;
    }
    if (baseUrl) {
      return new URL(urlStr, baseUrl).toString();
    }
    return urlStr;
  } catch {
    return urlStr;
  }
}

// 1. Parser JSON-LD (Schema.org)
export function parseJsonLd(html: string, baseUrl?: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);

      const candidates: any[] = [];
      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        candidates.push(...parsed["@graph"]);
      } else if (parsed.itemListElement && Array.isArray(parsed.itemListElement)) {
        for (const elem of parsed.itemListElement) {
          if (elem.item) candidates.push(elem.item);
          else candidates.push(elem);
        }
      } else {
        candidates.push(parsed);
      }

      for (const cand of candidates) {
        if (!cand || typeof cand !== "object") continue;
        const type = String(cand["@type"] || "").toLowerCase();

        // A) Nabídka práce (JobPosting) - používá Jobs.cz, StartupJobs, Google Jobs
        if (type.includes("jobposting") || type.includes("job")) {
          const loc = cand.jobLocation;
          let city = "";
          if (typeof loc === "string") city = loc;
          else if (loc?.address) {
            city = loc.address.addressLocality || loc.address.streetAddress || loc.address.addressRegion || "";
          }

          let salary = "";
          if (cand.baseSalary) {
            if (cand.baseSalary.value) {
              const val = cand.baseSalary.value.value || cand.baseSalary.value.minValue || cand.baseSalary.value;
              salary = `${val} ${cand.baseSalary.currency || "CZK"}`;
            } else if (typeof cand.baseSalary === "string") {
              salary = cand.baseSalary;
            }
          }

          items.push({
            nazev: cand.title || cand.name || "Pracovní pozice",
            firma: cand.hiringOrganization?.name || cand.hiringOrganization || "Neuvedeno",
            mesto: city || "Česká republika / Remote",
            cena_mzda: salary || "Dle dohody",
            typ_uvazku: Array.isArray(cand.employmentType) ? cand.employmentType.join(", ") : (cand.employmentType || "Plný úvazek"),
            odkaz: resolveUrl(cand.url || cand.sameAs || "", baseUrl),
            datum: cand.datePosted ? new Date(cand.datePosted).toLocaleDateString("cs-CZ") : new Date().toLocaleDateString("cs-CZ"),
            popis: (cand.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300),
          });
        }
        // B) Firma / Organizace / Podnikatel (Organization, LocalBusiness, Corporation, Store)
        else if (
          type.includes("organization") ||
          type.includes("localbusiness") ||
          type.includes("corporation") ||
          type.includes("store") ||
          type.includes("company")
        ) {
          const addr = cand.address;
          let addressStr = "";
          let cityStr = "";
          let zipStr = "";
          if (typeof addr === "string") addressStr = addr;
          else if (addr && typeof addr === "object") {
            cityStr = addr.addressLocality || "";
            addressStr = `${addr.streetAddress || ""} ${cityStr}`.trim();
            zipStr = addr.postalCode || "";
          }

          items.push({
            nazev: cand.name || cand.legalName || "Firma / Organizace",
            ico: cand.taxID || cand.vatID || cand.leiCode || "",
            email: cand.email || "",
            telefon: cand.telephone || "",
            adresa: addressStr || "Česká republika",
            mesto: cityStr || "",
            psc: zipStr || "",
            odkaz: resolveUrl(cand.url || cand.sameAs || "", baseUrl),
            popis: (cand.description || "").replace(/<[^>]+>/g, " ").trim().slice(0, 300),
          });
        }
        // C) Produkt (Product)
        else if (type.includes("product")) {
          const offer = Array.isArray(cand.offers) ? cand.offers[0] : cand.offers;
          items.push({
            nazev: cand.name || "Produkt",
            cena: offer?.price ? Number(offer.price) : 0,
            mena: offer?.priceCurrency || "CZK",
            znacka_vyrobce: cand.brand?.name || cand.brand || "",
            dostupnost: offer?.availability ? (offer.availability.includes("InStock") ? "Skladem" : "Na objednávku") : "Skladem",
            odkaz: resolveUrl(cand.url || "", baseUrl),
            obrazek: cand.image || "",
            popis: (cand.description || "").replace(/<[^>]+>/g, " ").trim().slice(0, 250),
          });
        }
        // D) Článek / Zpráva (Article / NewsArticle)
        else if (type.includes("article")) {
          items.push({
            nazev: cand.headline || cand.name || "Článek",
            autor: cand.author?.name || cand.author || "",
            datum: cand.datePublished ? new Date(cand.datePublished).toLocaleDateString("cs-CZ") : "",
            odkaz: resolveUrl(cand.url || "", baseUrl),
            popis: (cand.description || "").replace(/<[^>]+>/g, " ").trim().slice(0, 250),
          });
        }
        // E) Obecný Schema.org prvek
        else if (cand.name || cand.title) {
          items.push({
            nazev: cand.name || cand.title,
            odkaz: resolveUrl(cand.url || cand.sameAs || "", baseUrl),
            popis: (cand.description || "").replace(/<[^>]+>/g, " ").trim().slice(0, 250),
            telefon: cand.telephone || "",
            email: cand.email || "",
          });
        }
      }
    } catch {
      // Ignorovat nevalidní JSON bloky
    }
  }

  return items;
}

// 2. Parser HTML karet (opakující se inzeráty, karty nabídek, články)
export function parseHtmlCards(
  html: string,
  baseUrl?: string,
  options?: {
    itemSelectorHint?: string;
  }
): ScrapedItem[] {
  const items: ScrapedItem[] = [];

  // Hledání bloků: <article>, nebo <div class="...job...">, <div class="...card...">, <li class="...">
  // Vyčistíme skripty a styly
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Strategie 1: Hledání tagů <article ...> ... </article>
  const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let articleMatch;
  const cardBlocks: string[] = [];

  while ((articleMatch = articleRegex.exec(cleanHtml)) !== null && cardBlocks.length < 30) {
    cardBlocks.push(articleMatch[1]);
  }

  // Strategie 2: Pokud nejsou tagy article, hledáme elementy s třídou obsahující job, offer, inzerat, card, listing
  if (cardBlocks.length === 0) {
    const divCardRegex = /<(?:div|li|section)[^>]*class=["'][^"']*(?:job|offer|inzerat|vacancy|listing|position|card)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|section)>/gi;
    let divMatch;
    while ((divMatch = divCardRegex.exec(cleanHtml)) !== null && cardBlocks.length < 30) {
      // Omezíme délku bloku aby to nebyl obří wrapper
      if (divMatch[1].length < 8000 && divMatch[1].length > 50) {
        cardBlocks.push(divMatch[1]);
      }
    }
  }

  // Zpracování nalezených karet
  for (const block of cardBlocks) {
    // A) Titulek / Název pozice (z h1, h2, h3, h4 nebo odkazu s třídou title)
    const titleMatch =
      block.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i) ||
      block.match(/<a[^>]*class=["'][^"']*(?:title|heading|nazev)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);

    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (!rawTitle || rawTitle.length < 3 || rawTitle.toLowerCase().includes("cookie")) continue;

    // B) Odkaz (href z prvního tagu <a href="...">)
    const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    const rawLink = linkMatch ? resolveUrl(linkMatch[1], baseUrl) : "";

    // C) Firma / Organizace / Zaměstnavatel
    const companyMatch =
      block.match(/<[^>]*class=["'][^"']*(?:company|firm|employer|zamestnavatel|spolecnost|vyrobce|brand)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) ||
      block.match(/(?:Firma|Zaměstnavatel|Společnost|Výrobce):\s*([a-zA-Z0-9\s.s.r.o.a.s]+)/i);
    const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // D) Částka / Cena / Mzda
    const priceMatch =
      block.match(/<[^>]*class=["'][^"']*(?:salary|wage|plat|mzda|odmena|price|cena)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) ||
      block.match(/(\d[\d\s.,]{1,}\s*(?:Kč|CZK|EUR|€|USD|\$)(?:\s*\/\s*(?:měsíc|hod|m|h))?)/i);
    const price = priceMatch ? priceMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // E) Lokalita / Město / Adresa
    const locMatch =
      block.match(/<[^>]*class=["'][^"']*(?:location|city|mesto|lokalita|adresa|address)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) ||
      block.match(/\b(Praha|Brno|Ostrava|Plzeň|Liberec|Olomouc|České Budějovice|Hradec Králové|Pardubice|Zlín|Remote|Hybrid)\b/i);
    const location = locMatch ? (locMatch[1] ? locMatch[1].replace(/<[^>]+>/g, "").trim() : locMatch[0]) : "";

    // F) Telefonní číslo
    const telMatch =
      block.match(/(?:tel:|href=["']tel:)([^"'>\s]+)/i) ||
      block.match(/(?:\+420\s*)?[1-9]\d{2}\s*\d{3}\s*\d{3}/);
    const phone = telMatch ? (telMatch[1] || telMatch[0]).replace(/\s+/g, " ").trim() : "";

    // G) E-mailová adresa
    const mailMatch =
      block.match(/(?:mailto:|href=["']mailto:)([^"'>\s?]+)/i) ||
      block.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = mailMatch ? (mailMatch[1] || mailMatch[0]).trim() : "";

    // H) IČO (pokud je na kartě firmy)
    const icoMatch = block.match(/(?:IČO?|IČ)[:\s]+(\d{8})/i) || block.match(/\b(\d{8})\b/);
    const ico = icoMatch ? icoMatch[1] : "";

    // I) Obrázek (Logo, produkt, fotka)
    const imgMatch = block.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
    const image = imgMatch ? resolveUrl(imgMatch[1], baseUrl) : "";

    // J) Popis / Krátký text
    const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const desc = pMatch ? pMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300) : "";

    const item: Record<string, any> = {
      nazev: rawTitle,
      odkaz: rawLink || (baseUrl || ""),
    };
    if (company) item.firma = company;
    if (location) item.adresa_mesto = location;
    if (phone) item.telefon = phone;
    if (email) item.email = email;
    if (ico) item.ico = ico;
    if (price) item.cena_hodnota = price;
    if (image) item.obrazek = image;
    if (desc) item.popis = desc;
    item.datum = new Date().toLocaleDateString("cs-CZ");

    items.push(item);
  }

  return items;
}

// 3. Parser JSON API (pokud web vrací přímo JSON odpověď z interního API)
export function parseJsonApi(jsonText: string, baseUrl?: string): ScrapedItem[] {
  try {
    const data = JSON.parse(jsonText);
    let list: any[] = [];

    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object") {
      const arrayKey = ["items", "companies", "firms", "jobs", "data", "results", "offers", "positions", "rows"].find(
        (k) => Array.isArray(data[k])
      );
      if (arrayKey) {
        list = data[arrayKey];
      }
    }

    if (list.length === 0) return [];

    return list.slice(0, 30).map((item) => {
      if (typeof item !== "object" || item === null) return { hodnota: item };

      const mapped: Record<string, any> = {};
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          mapped[k] = v;
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const [subK, subV] of Object.entries(v)) {
            if (typeof subV === "string" || typeof subV === "number") {
              mapped[`${k}_${subK}`] = subV;
            }
          }
        }
      }

      // Sjednocený primární název
      if (!mapped.nazev) {
        mapped.nazev = item.name || item.title || item.company_name || item.position || item.label || "";
      }
      if (!mapped.odkaz && (item.url || item.link)) {
        mapped.odkaz = resolveUrl(item.url || item.link, baseUrl);
      }

      return mapped;
    });
  } catch {
    return [];
  }
}

// Ukázková data pro pracovní portály (pro testovací účely nebo fallback při Cloudflare / bot ochraně)
export function getSampleJobOffers(): ScrapedItem[] {
  return [
    {
      nazev_pozice: "Senior Fullstack Vývojář (Next.js / Node.js)",
      firma: "TechVision Solutions s.r.o.",
      mesto: "Praha / Remote",
      mzda: "95 000 – 125 000 Kč / měsíc",
      typ_uvazku: "Plný úvazek / IČO",
      odkaz: "https://jobstack.it/nabidka/techvision-senior-fullstack",
      datum_vlozeni: new Date().toLocaleDateString("cs-CZ"),
      popis: "Hledáme zkušeného TypeScript vývojáře pro vývoj moderních podnikových B2B aplikací v Next.js.",
    },
    {
      nazev_pozice: "Data & BI Analytik (SQL, Power BI)",
      firma: "FinData Analytics a.s.",
      mesto: "Brno - Střed",
      mzda: "75 000 – 90 000 Kč / měsíc",
      typ_uvazku: "Plný úvazek",
      odkaz: "https://jobs.cz/rpd/165489721",
      datum_vlozeni: new Date().toLocaleDateString("cs-CZ"),
      popis: "Návrh datových modelů, optimalizace SQL dotazů a tvorba interaktivních manažerských reportů.",
    },
    {
      nazev_pozice: "DevOps / Cloud Specialista (Kubernetes, AWS)",
      firma: "CloudScale Consulting",
      mesto: "Praha & Remote",
      mzda: "110 000 – 140 000 Kč / měsíc",
      typ_uvazku: "IČO / HPP",
      odkaz: "https://jobstack.it/nabidka/cloudscale-devops-lead",
      datum_vlozeni: new Date().toLocaleDateString("cs-CZ"),
      popis: "Správa kontejnerizované infrastruktury, CI/CD pipeline a monitorovacích nástrojů.",
    },
    {
      nazev_pozice: "Produktový Manažer / PO pro E-commerce",
      firma: "RetailTech Innovations",
      mesto: "Praha 4 - Chodov",
      mzda: "85 000 – 105 000 Kč / měsíc",
      typ_uvazku: "Plný úvazek",
      odkaz: "https://jobs.cz/rpd/165489799",
      datum_vlozeni: new Date().toLocaleDateString("cs-CZ"),
      popis: "Vedení produktového backlogu, prioritizace požadavků a spolupráce se zákazníky i vývojovým týmem.",
    },
  ];
}
