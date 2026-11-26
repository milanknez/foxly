import * as Tesseract from "tesseract.js";

export interface ExtractedInvoice {
  supplier: string;
  ico: string;
  dic: string;
  invoiceNumber: string;
  variableSymbol: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  bankAccount: string;
  rawText: string;
}

// Inteligentní regex parser pro české a evropské faktury (odolný vůči diakritice i OCR chybám)
export function parseInvoiceText(text: string): ExtractedInvoice {
  const result: ExtractedInvoice = {
    supplier: "",
    ico: "",
    dic: "",
    invoiceNumber: "",
    variableSymbol: "",
    issueDate: "",
    dueDate: "",
    totalAmount: 0,
    currency: "CZK",
    bankAccount: "",
    rawText: text,
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. IČO (IČO, ICO, IČ, IC)
  const icoMatch =
    text.match(/(?:I[ČC]O?|I[ČC]|Identifika[čc]n[ií]\s*[čc][ií]slo)[:\s]+(\d{8})/i) ||
    text.match(/\b(\d{8})\b/);
  if (icoMatch) {
    result.ico = icoMatch[1];
  }

  // 2. DIČ / DIC
  const dicMatch =
    text.match(/(?:DI[ČC]|VAT\s*ID)[:\s]+(CZ\d{8,10})/i) ||
    text.match(/\b(CZ\d{8,10})\b/i);
  if (dicMatch) {
    result.dic = dicMatch[1].toUpperCase();
  }

  // 3. Číslo faktury / Doklad
  const invMatch =
    text.match(
      /(?:Faktura\s*[-–]?\s*da[ňn]ov[yý]\s*doklad\s*[čc]\.?|Faktura\s*[čc]\.?|[ČC][ií]slo\s*faktury|Da[ňn]ov[yý]\s*doklad\s*[čc]\.?|Doklad\s*[čc]\.?|Invoice\s*no\.?)[:\s]+([A-Z0-9\/\-]+)/i
    );
  if (invMatch) {
    result.invoiceNumber = invMatch[1].trim();
  }

  // 4. Variabilní symbol
  const vsMatch = text.match(
    /(?:Variabiln[ií]\s*symbol|Var\.?\s*symbol|VS)[:\s]+(\d+)/i
  );
  if (vsMatch) {
    result.variableSymbol = vsMatch[1].trim();
  } else if (result.invoiceNumber && /^\d+$/.test(result.invoiceNumber)) {
    result.variableSymbol = result.invoiceNumber;
  }

  // 5. Datum vystavení
  const issueMatch = text.match(
    /(?:Datum\s*vystaven[ií]|Vystaveno|Datum\s*dokladu)[:\s]+(\d{1,2}\s*[\.\/]\s*\d{1,2}\s*[\.\/]\s*\d{4})/i
  );
  if (issueMatch) {
    result.issueDate = normalizeDate(issueMatch[1]);
  }

  // 6. Datum splatnosti
  const dueMatch = text.match(
    /(?:Datum\s*splatnost[ií]|Splatnost|Splatn[eé]\s*do)[:\s]+(\d{1,2}\s*[\.\/]\s*\d{1,2}\s*[\.\/]\s*\d{4})/i
  );
  if (dueMatch) {
    result.dueDate = normalizeDate(dueMatch[1]);
  }

  // 7. Částka celkem / K úhradě
  const amountMatch =
    text.match(
      /(?:Celkem\s*k\s*[uú]hrad[eě]|K\s*[uú]hrad[eě]\s*celkem|[ČC][aá]stka\s*k\s*[uú]hrad[eě]|Celkem\s*s\s*DPH|Celkem|K\s*[uú]hrad[eě])[:\s]+([0-9\s]+(?:[,\.][0-9]{2})?)\s*(K[čc]|CZK|EUR|€)?/i
    ) || text.match(/([0-9\s]+[,\.][0-9]{2})\s*(?:K[čc]|CZK)/i);

  if (amountMatch) {
    const rawVal = amountMatch[1].replace(/\s+/g, "").replace(",", ".");
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      result.totalAmount = parsed;
    }
    if (amountMatch[2]) {
      const cur = amountMatch[2].toUpperCase();
      result.currency = cur === "€" || cur === "EUR" ? "EUR" : "CZK";
    }
  }

  // 8. Číslo účtu / IBAN
  const accMatch =
    text.match(/(?:[ČC][ií]slo\s*[uú][čc]tu|Bankovn[ií]\s*spojen[ií]|[ÚU][čc]et)[:\s]+([0-9\/\-]+)/i) ||
    text.match(/(?:IBAN)[:\s]+([A-Z0-9\s]{15,34})/i);
  if (accMatch) {
    result.bankAccount = accMatch[1].trim();
  }

  // 9. Dodavatel
  const supplierMatch = text.match(/(?:Dodavatel|Dod[aá]vaj[ií]c[ií])[:\s]+([^\n\r]+)/i);
  if (supplierMatch) {
    result.supplier = supplierMatch[1].trim();
  } else {
    for (const line of lines.slice(0, 8)) {
      if (
        line.length > 3 &&
        !line.toLowerCase().includes("faktura") &&
        !line.toLowerCase().includes("doklad") &&
        !line.toLowerCase().includes("dodavatel") &&
        !line.toLowerCase().includes("odběratel") &&
        !line.toLowerCase().includes("odberatel") &&
        !/^\d+$/.test(line)
      ) {
        result.supplier = line;
        break;
      }
    }
  }

  return result;
}

function normalizeDate(rawDate: string): string {
  try {
    const parts = rawDate.replace(/\s+/g, "").split(/[\.\/]/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }
  return rawDate;
}

// Vytěžení z PDF nebo obrázku
export async function extractInvoiceFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedInvoice> {
  let extractedText = "";

  if (mimeType === "application/pdf") {
    try {
      // Moderní API pro pdf-parse v2
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = (await import("pdf-parse")) as any;
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const data = await parser.getText();
        extractedText = data.text || "";
        await parser.destroy();
      } else if (typeof pdfModule === "function") {
        const data = await pdfModule(buffer);
        extractedText = data.text || "";
      }
    } catch (e) {
      console.warn("pdf-parse text extraction failed:", e);
    }
  }

  // Pokud je to obrázek (JPEG, PNG) nebo PDF bez textové vrstvy, zkusíme OCR s časovým limitem 10s
  if (!extractedText.trim() && (mimeType.startsWith("image/") || mimeType === "application/pdf")) {
    try {
      const ocrPromise = (async () => {
        const worker = await Tesseract.createWorker("eng");
        const ret = await worker.recognize(buffer);
        await worker.terminate();
        return ret.data.text;
      })();

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout")), 10000)
      );

      extractedText = await Promise.race([ocrPromise, timeoutPromise]);
    } catch (err) {
      console.warn("Tesseract OCR fallback error / timeout:", err);
    }
  }

  return parseInvoiceText(extractedText);
}
