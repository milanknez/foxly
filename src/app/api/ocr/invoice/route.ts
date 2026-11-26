import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractInvoiceFromBuffer } from "@/lib/ocr-invoice";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nebyl nahrán žádný soubor" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

    const extracted = await extractInvoiceFromBuffer(buffer, mimeType);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      invoice: extracted,
    });
  } catch (error) {
    console.error("OCR extract error:", error);
    return NextResponse.json({ error: "Chyba při vytěžování faktury" }, { status: 500 });
  }
}
