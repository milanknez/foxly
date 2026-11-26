import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
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
      include: {
        apps: {
          include: {
            tables: {
              include: {
                _count: { select: { records: true } },
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("GET /api/workspaces/[slug]/settings error:", error);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug } = await params;
    const body = await req.json();

    const updated = await db.workspace.update({
      where: { slug: workspaceSlug },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
        ...(body.companyDetails !== undefined && { companyDetails: body.companyDetails }),
        ...(body.plugins !== undefined && { plugins: body.plugins }),
      },
    });

    return NextResponse.json({ success: true, workspace: updated });
  } catch (error) {
    console.error("PATCH /api/workspaces/[slug]/settings error:", error);
    return NextResponse.json({ error: "Chyba při ukládání nastavení" }, { status: 500 });
  }
}
