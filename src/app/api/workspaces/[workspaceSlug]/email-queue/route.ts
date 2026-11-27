import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQueueData } from "@/lib/email-queue-service";

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
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const data = await getQueueData(workspace.id, 150);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Chyba při načítání fronty e-mailů:", error);
    return NextResponse.json({ error: error.message || "Chyba serveru" }, { status: 500 });
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
    const { delaySeconds } = body;

    const delayNum = Number(delaySeconds);
    if (!delayNum || delayNum < 1) {
      return NextResponse.json({ error: "Neplatná hodnota prodlevy" }, { status: 400 });
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const currentDetails = (workspace.companyDetails as Record<string, any>) || {};
    const updatedDetails = {
      ...currentDetails,
      emailQueueDelay: delayNum,
    };

    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        companyDetails: updatedDetails,
      },
    });

    return NextResponse.json({ success: true, delaySeconds: delayNum });
  } catch (error: any) {
    console.error("Chyba při ukládání nastavení fronty:", error);
    return NextResponse.json({ error: error.message || "Chyba serveru" }, { status: 500 });
  }
}
