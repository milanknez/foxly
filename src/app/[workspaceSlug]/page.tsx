import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkspaceHomeClient from "./workspace-home-client";

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.id },
        include: { user: true, tablePermissions: true },
      },
      apps: {
        orderBy: { sortOrder: "asc" },
        include: {
          tables: {
            orderBy: { sortOrder: "asc" },
            include: {
              _count: { select: { records: true, columns: true } },
            },
          },
          dashboards: {
            orderBy: { sortOrder: "asc" },
            include: {
              _count: { select: { widgets: true } },
            },
          },
        },
      },
    },
  });

  if (!workspace) notFound();

  const currentMember = workspace.members[0];
  const userRole = session.isSystemAdmin ? "SUPERADMIN" : currentMember?.role || "MEMBER";
  const isPrivileged = session.isSystemAdmin || userRole === "OWNER" || userRole === "ADMIN";

  // Filtrování aplikací a tabulek podle oprávnění
  let visibleApps = workspace.apps;
  if (!isPrivileged && currentMember) {
    const allowedAppIds = Array.isArray(currentMember.allowedAppIds) ? currentMember.allowedAppIds : [];
    if (allowedAppIds.length > 0) {
      visibleApps = visibleApps.filter((a) => allowedAppIds.includes(a.id));
    }

    const hiddenTableIds = new Set(
      currentMember.tablePermissions
        ?.filter((tp) => tp.permissionLevel === "NO_ACCESS")
        .map((tp) => tp.tableId) || []
    );

    visibleApps = visibleApps.map((a) => ({
      ...a,
      tables: a.tables.filter((t) => !hiddenTableIds.has(t.id)),
    }));
  }

  const totalTables = visibleApps.reduce((acc, a) => acc + a.tables.length, 0);
  const totalRecords = visibleApps.reduce(
    (acc, a) => acc + a.tables.reduce((tAcc, t) => tAcc + t._count.records, 0),
    0
  );

  const clientApps = visibleApps.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    color: a.color,
    tables: a.tables.map((t) => ({
      id: t.id,
      name: t.name,
      sortOrder: t.sortOrder,
      _count: t._count,
    })),
    dashboards: a.dashboards.map((d) => ({
      id: d.id,
      name: d.name,
      sortOrder: d.sortOrder,
      _count: d._count,
    })),
  }));

  return (
    <WorkspaceHomeClient
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      userName={session.name}
      isPrivileged={isPrivileged}
      apps={clientApps}
      totalTables={totalTables}
      totalRecords={totalRecords}
    />
  );
}
