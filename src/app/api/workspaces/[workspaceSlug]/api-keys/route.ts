import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiToken } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug } = await params;
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const apiKeys = await db.apiKey.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    });

    // Zamaskování klíče pro bezpečné zobrazení v UI
    const sanitizedKeys = apiKeys.map((k) => {
      const perms = (k.permissions as Record<string, any>) || {};
      return {
        id: k.id,
        name: k.name,
        maskedKey: perms.maskedKey || "foxly_live_••••••••",
        readOnly: !!perms.readOnly,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        isExpired: k.expiresAt ? new Date(k.expiresAt) < new Date() : false,
      };
    });

    return NextResponse.json({ apiKeys: sanitizedKeys });
  } catch (error) {
    console.error("GET api-keys error:", error);
    return NextResponse.json({ error: "Chyba při načítání API klíčů" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug } = await params;
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = (body.name || "API Token").trim();
    const expiresInDays = Number(body.expiresInDays) || 0; // 0 = neomezená platnost
    const readOnly = Boolean(body.readOnly);

    const { token, keyHash, maskedKey } = generateApiToken();

    let expiresAt: Date | null = null;
    if (expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const createdKey = await db.apiKey.create({
      data: {
        workspaceId: workspace.id,
        name,
        keyHash,
        expiresAt,
        permissions: {
          readOnly,
          maskedKey,
        },
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: createdKey.id,
        name: createdKey.name,
        maskedKey,
        readOnly,
        createdAt: createdKey.createdAt,
        expiresAt: createdKey.expiresAt,
      },
      // Surový token se vrací POUZE JEDNOU při vytvoření!
      token,
      rawKey: token,
    });
  } catch (error) {
    console.error("POST api-keys error:", error);
    return NextResponse.json({ error: "Chyba při vytváření API klíče" }, { status: 500 });
  }
}
