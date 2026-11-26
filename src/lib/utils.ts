import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "CZK") {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-";
  return formatCzechDate(date) || "-";
}

/**
 * Formátuje datum do českého standardního tvaru s tečkami: DD.MM.RRRR (např. 19.11.2026).
 */
export function formatCzechDate(date: unknown): string {
  if (date === null || date === undefined) return "";
  const str = String(date).trim();
  if (!str || str === "-") return "";

  // Již v českém formátu DD.MM.YYYY nebo D.M.YYYY
  const dotMatch = str.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (dotMatch) {
    const d = dotMatch[1].padStart(2, "0");
    const m = dotMatch[2].padStart(2, "0");
    return `${d}.${m}.${dotMatch[3]}`;
  }

  // ISO formát YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${d}.${m}.${y}`;
  }

  // Fallback přes Date objekt
  const d = typeof date === "string" ? new Date(date) : date;
  if (d instanceof Date && !isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${d.getFullYear()}`;
  }

  return str;
}

/**
 * Převede české datum (DD.MM.RRRR) nebo libovolný datumový řetězec na standardní ISO formát (YYYY-MM-DD)
 * vhodný pro uložení do databáze a nativní HTML5 datepicker.
 */
export function parseCzechDateToIso(str: unknown): string {
  if (str === null || str === undefined) return "";
  const trimmed = String(str).trim();
  if (!trimmed) return "";

  // Už v ISO formátu YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // České datum DD.MM.RRRR nebo D.M.RRRR
  const dotMatch = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (dotMatch) {
    const d = dotMatch[1].padStart(2, "0");
    const m = dotMatch[2].padStart(2, "0");
    const y = dotMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Zkusíme Date objekt
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Normalizuje text a vytvoří hezký, čitelný systémový identifikátor sloupce ve formátu `fld_nazev_pole`.
 */
export function slugifyColumnKey(label: string): string {
  if (!label || !label.trim()) return "fld_sloupec";

  let text = (" " + label.trim().toLowerCase() + " ")
    .replace(/\s+(?:č\.\s*ú\.|číslo\s*účtu)\s+/gi, " cislo_uctu ")
    .replace(/\s+(?:var\.\s*symb\.|variabilní\s*symbol|var\.\s*symbol)\s+/gi, " vs ")
    .replace(/\s+(?:spec\.\s*symb\.|specifický\s*symbol)\s+/gi, " ss ")
    .replace(/\s+(?:konst\.\s*symb\.|konstantní\s*symbol)\s+/gi, " ks ")
    .replace(/\s+(?:ičo|ič)\s+/gi, " ico ")
    .replace(/\s+dič\s+/gi, " dic ")
    .replace(/\s+dph\s+/gi, " dph ")
    .replace(/\s+psč\s+/gi, " psc ")
    .replace(/\s+(?:tel\.|telefon)\s+/gi, " telefon ")
    .replace(/\s+(?:e-mail|email)\s+/gi, " email ")
    .replace(/\s+(?:url|web|webová\s*adresa)\s+/gi, " url ")
    .replace(/\s+(?:ks|kusů|množství)\s+/gi, " mnozstvi ")
    .replace(/\s+(?:kč|eur|czk)\s+/gi, " ")
    .replace(/%/g, "procent")
    .trim();

  // Odstranění diakritiky
  let slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  // Maximální rozumná délka sloupce (32 znaků)
  if (slug.length > 32) {
    slug = slug.substring(0, 32).replace(/_$/, "");
  }

  // Fallback pokud po očištění nic nezbylo
  if (!slug) {
    slug = "sloupec";
  }

  // Pokud začíná fld_, necháme tak, jinak přidáme prefix
  if (slug.startsWith("fld_")) {
    return slug;
  }
  return `fld_${slug}`;
}

/**
 * Zajistí unikátnost klíče sloupce. Pokud klíč již existuje, přidá číselnou příponu (_2, _3, ...).
 */
export function generateUniqueColumnKey(baseKey: string, existingKeys: Set<string> | string[]): string {
  const keysSet = existingKeys instanceof Set ? existingKeys : new Set(existingKeys);

  // Normalizujeme klíč
  let key = slugifyColumnKey(baseKey);

  if (!keysSet.has(key)) {
    return key;
  }

  // Pokud klíč už končí číslem (např. fld_polozka_2), odseparujeme základ
  const match = key.match(/^(.*?)(?:_(\d+))?$/);
  const root = match && match[1] ? match[1] : key;
  let counter = match && match[2] ? parseInt(match[2], 10) + 1 : 2;

  while (keysSet.has(`${root}_${counter}`)) {
    counter++;
  }

  return `${root}_${counter}`;
}
