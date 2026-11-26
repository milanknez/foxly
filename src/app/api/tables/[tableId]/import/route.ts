import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// Hromadný import dat z Excelu (.xlsx / .csv) do existující tabulky
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { tableId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nebyl nahrán žádný soubor" }, { status: 400 });
    }

    const table = await db.table.findUnique({
      where: { id: tableId },
      include: { columns: true },
    });

    if (!table) {
      return NextResponse.json({ error: "Tabulka nenalezena" }, { status: 404 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Soubor Excel neobsahuje žádné řádky" }, { status: 400 });
    }

    // Vytvoříme mapu pro automatické párování sloupců podle shody názvu
    // např. "Zákazník" z Excelu spáruje se sloupcem label="Zákazník"
    const columnMap: Record<string, string> = {};
    for (const col of table.columns) {
      columnMap[col.label.toLowerCase().trim()] = col.key;
      columnMap[col.key.toLowerCase().trim()] = col.key;
    }

    const recordsToCreate = [];
    for (const rawRow of rawRows) {
      const recordData: Record<string, unknown> = {};

      for (const [header, val] of Object.entries(rawRow)) {
        const cleanHeader = header.toLowerCase().trim();
        const matchedKey = columnMap[cleanHeader];
        if (matchedKey) {
          recordData[matchedKey] = val;
        }
      }

      // Doplnění chybějících sloupců výchozími hodnotami
      for (const col of table.columns) {
        if (recordData[col.key] === undefined) {
          if (col.type === "CHECKBOX") recordData[col.key] = false;
          else if (col.type === "NUMBER" || col.type === "CURRENCY") recordData[col.key] = 0;
          else recordData[col.key] = "";
        }
      }

      recordsToCreate.push({
        tableId,
        data: recordData as Prisma.InputJsonValue,
        createdById: session.id,
        source: "EXCEL_IMPORT",
      });
    }

    // Dávkový zápis do databáze
    const createdCount = await db.record.createMany({
      data: recordsToCreate,
    });

    return NextResponse.json({
      success: true,
      message: `Úspěšně naimportováno ${createdCount.count} záznamů ze souboru ${file.name}`,
      count: createdCount.count,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json({ error: "Chyba při zpracování souboru Excel" }, { status: 500 });
  }
}
