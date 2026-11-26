import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import RecordPrintView from "./record-print-view";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    appId: string;
    tableId: string;
    recordId: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug, appId, tableId, recordId } = await params;

  const record = await db.record.findUnique({
    where: { id: recordId },
    include: {
      table: {
        include: {
          columns: { orderBy: { sortOrder: "asc" } },
          views: {
            where: { type: "PRINT" },
            orderBy: { createdAt: "asc" },
          },
          app: {
            include: {
              workspace: true,
            },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!record || record.table.app.workspace.slug !== workspaceSlug) {
    notFound();
  }

  const { table } = record;
  const { workspace } = table.app;

  return (
    <RecordPrintView
      record={{
        id: record.id,
        createdAt: record.createdAt,
        source: record.source,
        data: (record.data as Record<string, unknown>) || {},
        createdBy: record.createdBy,
      }}
      table={{
        id: table.id,
        name: table.name,
        singularName: table.singularName,
        columns: table.columns.map((c) => ({
          id: c.id,
          key: c.key,
          label: c.label,
          type: c.type,
          isPrimary: c.isPrimary,
        })),
        views: table.views.map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type,
          isDefault: v.isDefault,
          config: (v.config as Record<string, unknown>) || {},
        })),
      }}
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
        primaryColor: workspace.primaryColor,
        companyDetails: (workspace.companyDetails as Record<string, unknown>) || {},
      }}
      workspaceSlug={workspaceSlug}
      appId={appId}
      tableId={tableId}
    />
  );
}
