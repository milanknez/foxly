import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testAutomationRun } from "@/lib/workflow-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { automationId } = await params;
    const body = await request.json().catch(() => ({}));
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: "Vyberte záznam pro otestování workflow" }, { status: 400 });
    }

    const testResult = await testAutomationRun(automationId, recordId);

    return NextResponse.json({ success: true, result: testResult });
  } catch (error) {
    console.error("Test automation error:", error);
    const msg = error instanceof Error ? error.message : "Chyba při testování automatizace";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
