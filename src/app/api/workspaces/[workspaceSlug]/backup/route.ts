import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import JSZip from "jszip";
import * as XLSX from "xlsx";

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
                columns: { orderBy: { sortOrder: "asc" } },
                records: { orderBy: { createdAt: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const zip = new JSZip();

    // 1. Souhrnné metadata
    const metadata = {
      workspaceId: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      exportedAt: new Date().toISOString(),
      exportedBy: session.email,
      appsCount: workspace.apps.length,
      apps: workspace.apps.map((app) => ({
        id: app.id,
        name: app.name,
        tablesCount: app.tables.length,
        tables: app.tables.map((tbl) => ({
          id: tbl.id,
          name: tbl.name,
          singularName: tbl.singularName,
          columnsCount: tbl.columns.length,
          recordsCount: tbl.records.length,
          columns: tbl.columns.map((c) => ({
            id: c.id,
            key: c.key,
            label: c.label,
            type: c.type,
            isRequired: c.isRequired,
            isPrimary: c.isPrimary,
          })),
        })),
      })),
    };

    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    // 2. Pro každou aplikaci a tabulku vytvoříme Excel (.xlsx) a JSON data
    for (const app of workspace.apps) {
      const sanitizedAppName = app.name.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, "_");
      const appFolder = zip.folder(`aplikace_${sanitizedAppName}`);

      for (const table of app.tables) {
        const sanitizedTableName = table.name.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, "_");

        // Příprava dat pro Excel
        const excelRows: Record<string, unknown>[] = [];
        for (const rec of table.records) {
          const rowData: Record<string, unknown> = {
            "ID záznamu": rec.id,
            "Vytvořeno": rec.createdAt.toISOString(),
          };
          const rData = (rec.data || {}) as Record<string, unknown>;
          for (const col of table.columns) {
            rowData[col.label] = rData[col.key] ?? "";
          }
          excelRows.push(rowData);
        }

        // Vytvoření sešitu Excel
        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedTableName.substring(0, 31));
        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        appFolder?.file(`${sanitizedTableName}.xlsx`, excelBuffer);

        // JSON záloha dané tabulky
        appFolder?.file(
          `${sanitizedTableName}_records.json`,
          JSON.stringify(
            {
              tableId: table.id,
              tableName: table.name,
              columns: table.columns,
              records: table.records.map((r) => ({
                id: r.id,
                data: r.data,
                source: r.source,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
              })),
            },
            null,
            2
          )
        );
      }
    }

    // Vygenerování binárního ZIPu
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const safeDate = new Date().toISOString().substring(0, 10);
    const filename = `zaloha_${workspace.slug}_${safeDate}.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("GET /api/workspaces/[slug]/backup error:", error);
    return NextResponse.json({ error: "Chyba při generování zálohy" }, { status: 500 });
  }
}
