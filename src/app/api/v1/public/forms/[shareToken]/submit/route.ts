import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { triggerAutomationsForEvent } from "@/lib/workflow-engine";

// Veřejný endpoint pro příjem dat z iframe formuláře na externím webu
export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    const body = await request.json();
    const { data, _honeypot } = body;

    // 1. Anti-spam ochrana: Pokud bot vyplnil skryté honeypot pole, tiše ignorujeme
    if (_honeypot) {
      console.warn("Spam bot detected via honeypot field, ignoring.");
      return NextResponse.json({ success: true, message: "Odesláno" });
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Chybí data formuláře" }, { status: 400 });
    }

    // 2. Najdeme pohled formuláře podle tokenu
    const view = await db.view.findUnique({
      where: { shareToken },
      include: {
        table: {
          include: {
            columns: true,
          },
        },
      },
    });

    if (!view || !view.isPublic) {
      return NextResponse.json({ error: "Formulář nebyl nalezen nebo je neaktivní" }, { status: 404 });
    }

    const viewConfig = (view.config as Record<string, unknown>) || {};
    const hiddenDefaults = (viewConfig.hiddenDefaults as Record<string, unknown>) || {};

    // 3. Sloučení veřejných dat ze vstupu s výchozími skrytými hodnotami
    const recordData: Record<string, unknown> = {
      ...hiddenDefaults,
      ...data,
    };

    // 4. Uložení záznamu do databáze s označením zdroje WEB_FORM
    const record = await db.$transaction(async (tx) => {
      const rec = await tx.record.create({
        data: {
          tableId: view.tableId,
          data: recordData as Prisma.InputJsonValue,
          source: "WEB_FORM",
        },
      });

      await tx.auditLog.create({
        data: {
          recordId: rec.id,
          action: "WEB_SUBMIT",
          changes: { formTitle: view.name, data: recordData } as Prisma.InputJsonValue,
        },
      });

      return rec;
    });

    // Spuštění workflow automatizací (např. ON_CREATE z webového formuláře)
    triggerAutomationsForEvent({
      event: "CREATE",
      tableId: view.tableId,
      record: { id: record.id, data: recordData },
    }).catch((err) => console.error("Workflow trigger error on web submit:", err));

    const successMessage =
      (viewConfig.successMessage as string) || "Děkujeme, formulář byl úspěšně odeslán!";

    return NextResponse.json({
      success: true,
      message: successMessage,
      recordId: record.id,
    });
  } catch (error) {
    console.error("Public form submit error:", error);
    return NextResponse.json({ error: "Chyba při odesílání formuláře" }, { status: 500 });
  }
}
