import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { processNextPendingItem } from "@/lib/email-queue-service";

export async function POST(
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

    const result = await processNextPendingItem(workspace.id);

    // Zjistíme, kolik položek ještě čeká
    const remainingPending = await db.emailQueueItem.count({
      where: { workspaceId: workspace.id, status: "PENDING" },
    });

    return NextResponse.json({
      ...result,
      remainingPending,
    });
  } catch (error: any) {
    console.error("Chyba při zpracování fronty e-mailů:", error);
    return NextResponse.json({ error: error.message || "Chyba serveru" }, { status: 500 });
  }
}
