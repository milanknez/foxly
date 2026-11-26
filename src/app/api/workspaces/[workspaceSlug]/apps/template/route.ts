import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_TEMPLATES } from "@/lib/app-templates";

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
    const body = await request.json();
    const { templateId } = body;

    const template = APP_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: "Šablona nenalezena" }, { status: 404 });
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Pracovní prostor firmy nenalezen" }, { status: 404 });
    }

    const lastApp = await db.app.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { sortOrder: "desc" },
    });

    // Vytvoření aplikace ze šablony
    const newApp = await db.app.create({
      data: {
        workspaceId: workspace.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        color: template.color,
        sortOrder: (lastApp?.sortOrder ?? 0) + 1,
      },
    });

    const createdTables: any[] = [];

    // Vytvoření všech tabulek šablony
    for (let tIdx = 0; tIdx < template.tables.length; tIdx++) {
      const tplTable = template.tables[tIdx];

      const createdTable = await db.table.create({
        data: {
          appId: newApp.id,
          name: tplTable.name,
          singularName: tplTable.singularName,
          icon: tplTable.icon,
          sortOrder: tIdx + 1,
          columns: {
            create: tplTable.columns.map((c, cIdx) => ({
              key: c.key,
              label: c.label,
              type: c.type,
              isPrimary: c.isPrimary || false,
              isRequired: c.isRequired || false,
              config: c.config || {},
              sortOrder: cIdx + 1,
            })),
          },
        },
      });

      // Vytvoření výchozího pohledu
      await db.view.create({
        data: {
          tableId: createdTable.id,
          name: "Výchozí pohled",
          type: "GRID",
          isDefault: true,
          config: {},
        },
      });

      // Vytvoření veřejného webového formuláře pro online rezervace hostů (pokud je v šabloně)
      if (tplTable.publicForm) {
        const shareToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
        await db.view.create({
          data: {
            tableId: createdTable.id,
            name: tplTable.publicForm.title || `Veřejný rezervační formulář`,
            type: "FORM",
            isPublic: true,
            shareToken,
            config: {
              title: tplTable.publicForm.title,
              description: tplTable.publicForm.description,
              fields: tplTable.columns.map((c) => c.key),
            },
          },
        });
      }

      // Vložení ukázkových záznamů
      if (tplTable.sampleRecords && tplTable.sampleRecords.length > 0) {
        for (const sample of tplTable.sampleRecords) {
          await db.record.create({
            data: {
              tableId: createdTable.id,
              data: sample,
            },
          });
        }
      }

      createdTables.push(createdTable);
    }

    // Vytvoření ukázkového Dashboardu se všemi widgety
    if (template.dashboard) {
      const newDash = await db.dashboard.create({
        data: {
          appId: newApp.id,
          name: template.dashboard.name,
          description: template.dashboard.description,
          icon: "LayoutDashboard",
          sortOrder: 1,
        },
      });

      for (let wIdx = 0; wIdx < template.dashboard.widgets.length; wIdx++) {
        const w = template.dashboard.widgets[wIdx];
        const targetTable = createdTables[w.tableIndex] || createdTables[0];

        if (targetTable) {
          await db.widget.create({
            data: {
              dashboardId: newDash.id,
              tableId: targetTable.id,
              title: w.title,
              type: w.type,
              targetField: w.targetField || null,
              aggregation: w.aggregation || "COUNT",
              groupField: w.groupField || null,
              config: w.config || {},
              sortOrder: wIdx + 1,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      app: newApp,
      firstTableId: createdTables[0]?.id || null,
    });
  } catch (error) {
    console.error("Install template error:", error);
    return NextResponse.json({ error: "Chyba při instalaci šablony" }, { status: 500 });
  }
}
