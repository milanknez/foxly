import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_WORKSPACE_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB limit na firmu

// Pomocná funkce pro výpočet velikosti složky
async function getDirectorySizeBytes(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let totalSize = 0;
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
    return totalSize;
  } catch {
    return 0;
  }
}

// Bezpečné pročištění názvu souboru (slugify) se zachováním přípony
function sanitizeFilename(originalName: string): { base: string; ext: string } {
  const ext = path.extname(originalName).toLowerCase();
  const rawBase = path.basename(originalName, ext);
  const cleanBase = rawBase
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // odstranění diakritiky
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-") // pouze bezpečné znaky
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "soubor";

  return { base: cleanBase, ext };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceSlugParam = formData.get("workspaceSlug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nebyl vybrán žádný soubor" }, { status: 400 });
    }

    // Zjištění workspace firmy uživatele
    let workspaceSlug = workspaceSlugParam?.trim() || "";

    if (workspaceSlug) {
      const membership = await db.workspaceMember.findFirst({
        where: {
          userId: session.id,
          workspace: { slug: workspaceSlug },
        },
      });
      if (!membership && !session.isSystemAdmin) {
        return NextResponse.json({ error: "Nemáte přístup k této firmě" }, { status: 403 });
      }
    } else {
      const firstMember = await db.workspaceMember.findFirst({
        where: { userId: session.id },
        include: { workspace: true },
      });
      if (!firstMember && !session.isSystemAdmin) {
        return NextResponse.json({ error: "Uživatel není členem žádné firmy" }, { status: 403 });
      }
      workspaceSlug = firstMember?.workspace?.slug || "default";
    }

    // Cesta k adresáři firmy uvnitř PVC (public/uploads/[workspaceSlug])
    const uploadsDir = path.join(process.cwd(), "public", "uploads", workspaceSlug);
    await fs.mkdir(uploadsDir, { recursive: true });

    // Kontrola stávajícího zaplnění disku pro firmu (100 MB limit)
    const currentUsageBytes = await getDirectorySizeBytes(uploadsDir);
    const newFileSize = file.size;

    if (currentUsageBytes + newFileSize > MAX_WORKSPACE_STORAGE_BYTES) {
      const currentMb = (currentUsageBytes / (1024 * 1024)).toFixed(1);
      const fileMb = (newFileSize / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          error: `Byl překročen limit úložiště pro vaši firmu (100 MB). Aktuálně využito: ${currentMb} MB, nahrávaný soubor: ${fileMb} MB.`,
          limitBytes: MAX_WORKSPACE_STORAGE_BYTES,
          currentUsageBytes,
        },
        { status: 400 }
      );
    }

    // Vygenerování unikátního, ale čitelného názvu souboru: [kratke-id]-[nazev].[ext]
    const shortId = crypto.randomBytes(4).toString("hex");
    const { base, ext } = sanitizeFilename(file.name || "soubor");
    const safeFilename = `${shortId}-${base}${ext}`;

    const filePath = path.join(uploadsDir, safeFilename);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    // Veřejná URL adresa souboru
    const publicUrl = `/uploads/${workspaceSlug}/${safeFilename}`;

    return NextResponse.json({
      success: true,
      message: "Soubor byl úspěšně nahrán",
      url: publicUrl,
      filename: safeFilename,
      size: newFileSize,
      workspaceUsage: {
        usedBytes: currentUsageBytes + newFileSize,
        limitBytes: MAX_WORKSPACE_STORAGE_BYTES,
        usedPercentage: Number((((currentUsageBytes + newFileSize) / MAX_WORKSPACE_STORAGE_BYTES) * 100).toFixed(1)),
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : "Chyba při nahrávání souboru";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
