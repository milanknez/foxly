import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  forceSendItem,
  retryQueueItem,
  cancelQueueItem,
  deleteQueueItem,
  clearCompletedItems,
  retryAllFailed,
} from "@/lib/email-queue-service";

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

    const body = await req.json().catch(() => ({}));
    const { action, itemId } = body;

    switch (action) {
      case "force_send": {
        if (!itemId) return NextResponse.json({ error: "Chybí itemId" }, { status: 400 });
        const res = await forceSendItem(itemId, workspace.id);
        return NextResponse.json(res);
      }
      case "retry": {
        if (!itemId) return NextResponse.json({ error: "Chybí itemId" }, { status: 400 });
        const res = await retryQueueItem(itemId, workspace.id);
        return NextResponse.json(res);
      }
      case "cancel": {
        if (!itemId) return NextResponse.json({ error: "Chybí itemId" }, { status: 400 });
        const res = await cancelQueueItem(itemId, workspace.id);
        return NextResponse.json(res);
      }
      case "delete": {
        if (!itemId) return NextResponse.json({ error: "Chybí itemId" }, { status: 400 });
        const res = await deleteQueueItem(itemId, workspace.id);
        return NextResponse.json(res);
      }
      case "clear_completed": {
        const res = await clearCompletedItems(workspace.id);
        return NextResponse.json(res);
      }
      case "retry_all_failed": {
        const res = await retryAllFailed(workspace.id);
        return NextResponse.json(res);
      }
      default:
        return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Chyba při operaci nad frontou e-mailů:", error);
    return NextResponse.json({ error: error.message || "Chyba serveru" }, { status: 500 });
  }
}
