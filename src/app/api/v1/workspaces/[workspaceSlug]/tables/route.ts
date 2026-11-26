import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";

// Veřejný discovery endpoint pro AI a externí systémy - vrátí seznam tabulek a jejich sloupců ve workspace
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { workspaceSlug } = await params;
  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      apps: {
        include: {
          tables: {
            include: {
              columns: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  key: true,
                  label: true,
                  type: true,
                  isRequired: true,
                  isPrimary: true,
                  description: true,
                },
              },
              _count: {
                select: { records: true },
              },
            },
          },
        },
      },
    },
  });

  if (!workspace || workspace.id !== auth.workspaceId) {
    return NextResponse.json({ error: "Přístup k této firmě byl odepřen" }, { status: 403 });
  }

  const result = {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
    apps: workspace.apps.map((app) => ({
      id: app.id,
      name: app.name,
      tables: app.tables.map((t) => ({
        id: t.id,
        name: t.name,
        singularName: t.singularName,
        recordCount: t._count.records,
        columns: t.columns,
        endpoints: {
          getRecords: `/api/v1/tables/${t.id}/records`,
          createRecord: `/api/v1/tables/${t.id}/records`,
        },
      })),
    })),
  };

  return NextResponse.json(result);
}
