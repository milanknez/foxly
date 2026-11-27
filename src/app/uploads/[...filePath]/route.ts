import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filePath: string[] }> }
) {
  try {
    const { filePath } = await params;
    if (!filePath || filePath.length === 0) {
      return new NextResponse("Soubor nebyl specifikován", { status: 400 });
    }

    // Prevence directory traversal (..)
    const safeParts = filePath.map((p) => p.replace(/(\.\.[\/\\])/g, "").replace(/\.\./g, ""));
    const absolutePath = path.join(process.cwd(), "public", "uploads", ...safeParts);

    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return new NextResponse("Soubor nenalezen", { status: 404 });
      }

      const fileBuffer = await fs.readFile(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Length", String(stats.size));
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      // Pro PDF a běžné obrázky otevřít inline přímo v prohlížeči
      const isInline = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext);
      const filename = path.basename(absolutePath);
      headers.set("Content-Disposition", `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch {
      return new NextResponse("Soubor nebyl nalezen", { status: 404 });
    }
  } catch (error) {
    console.error("Chyba při poskytování souboru /uploads:", error);
    return new NextResponse("Chyba serveru", { status: 500 });
  }
}
