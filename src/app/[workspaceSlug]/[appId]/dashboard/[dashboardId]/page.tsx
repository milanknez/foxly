import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardViewClient from "./dashboard-view-client";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    appId: string;
    dashboardId: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug, appId, dashboardId } = await params;

  const dashboard = await db.dashboard.findUnique({
    where: { id: dashboardId },
    include: {
      widgets: {
        include: {
          table: {
            include: {
              records: {
                orderBy: { createdAt: "desc" },
              },
              columns: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      app: {
        include: {
          workspace: true,
          tables: {
            include: {
              columns: {
                orderBy: { sortOrder: "asc" },
              },
              records: {
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!dashboard || dashboard.app.workspace.slug !== workspaceSlug) {
    notFound();
  }

  // Připravíme data tabulek z aktuální aplikace pro výběr v tvorbě widgetů
  const appTables = dashboard.app.tables.map((t) => ({
    id: t.id,
    name: t.name,
    singularName: t.singularName,
    columns: t.columns.map((c) => ({
      id: c.id,
      key: c.key,
      label: c.label,
      type: c.type,
      config: c.config,
    })),
    records: t.records.map((r) => ({
      id: r.id,
      tableId: r.tableId,
      data: r.data,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  }));

  // Upravíme data widgetů pro klientskou komponentu
  const clientDashboard = {
    id: dashboard.id,
    appId: dashboard.appId,
    name: dashboard.name,
    description: dashboard.description,
    icon: dashboard.icon,
    widgets: dashboard.widgets.map((w) => ({
      id: w.id,
      dashboardId: w.dashboardId,
      tableId: w.tableId,
      title: w.title,
      type: w.type,
      targetField: w.targetField,
      aggregation: w.aggregation,
      groupField: w.groupField,
      config: w.config,
      sortOrder: w.sortOrder,
      table: {
        id: w.table.id,
        name: w.table.name,
        singularName: w.table.singularName,
        columns: w.table.columns.map((c) => ({
          id: c.id,
          key: c.key,
          label: c.label,
          type: c.type,
          config: c.config,
        })),
        records: w.table.records.map((r) => ({
          id: r.id,
          tableId: r.tableId,
          data: r.data,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      },
    })),
  };

  return (
    <DashboardViewClient
      workspaceSlug={workspaceSlug}
      appId={appId}
      dashboard={clientDashboard}
      tables={appTables}
    />
  );
}
