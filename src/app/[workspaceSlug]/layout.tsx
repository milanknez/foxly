import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shield } from "lucide-react";
import SidebarAppNav from "@/components/sidebar-app-nav";
import AppHeader from "@/components/app-header";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getSession();
  const { workspaceSlug } = await params;

  if (!session) {
    redirect("/login");
  }

  // Načtení dat firmy se všemi aplikacemi, tabulkami a dashboardy
  const [workspace, currentUser] = await Promise.all([
    db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.id },
          include: {
            tablePermissions: true,
          },
        },
        apps: {
          orderBy: { sortOrder: "asc" },
          include: {
            tables: {
              orderBy: { sortOrder: "asc" },
            },
            dashboards: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    }),
  ]);

  if (!workspace) {
    redirect("/login");
  }

  // Zabezpečení izolace
  if (!session.isSystemAdmin && workspace.members.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md text-center border border-slate-200">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Přístup odepřen</h2>
          <p className="text-sm text-slate-600 mt-2">
            Nejste členem firmy <strong>{workspace.name}</strong>. Data jsou striktně chráněna.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    );
  }

  const userMembership = workspace.members[0];
  const userRole = session.isSystemAdmin ? "SUPERADMIN" : userMembership?.role || "MEMBER";
  const isPrivileged = session.isSystemAdmin || userRole === "OWNER" || userRole === "ADMIN";

  // Filtrování aplikací a tabulek podle oprávnění uživatele
  let visibleApps = workspace.apps;
  if (!isPrivileged && userMembership) {
    const allowedAppIds = Array.isArray(userMembership.allowedAppIds) ? userMembership.allowedAppIds : [];
    if (allowedAppIds.length > 0) {
      visibleApps = visibleApps.filter((app) => allowedAppIds.includes(app.id));
    }

    // Filtrování tabulek, které mají zakázaný přístup (NO_ACCESS)
    const hiddenTableIds = new Set(
      userMembership.tablePermissions
        ?.filter((tp) => tp.permissionLevel === "NO_ACCESS")
        .map((tp) => tp.tableId) || []
    );

    visibleApps = visibleApps.map((app) => ({
      ...app,
      tables: app.tables.filter((t) => !hiddenTableIds.has(t.id)),
    }));
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* 1. Horní lišta */}
      <AppHeader
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          logoUrl: workspace.logoUrl,
          apps: visibleApps.map((a) => ({
            id: a.id,
            name: a.name,
            color: a.color,
            tables: a.tables.map((t) => ({ id: t.id, name: t.name })),
          })),
        }}
        user={{
          name: currentUser?.name || session.name,
          email: currentUser?.email || session.email,
          avatarUrl: currentUser?.avatarUrl || session.avatarUrl || null,
        }}
        userRole={userRole}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 2. Postranní panel s výběrem aplikací a tabulek */}
        <SidebarAppNav
          workspace={{
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            apps: visibleApps.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              icon: a.icon,
              color: a.color,
              tables: a.tables.map((t) => ({ id: t.id, name: t.name, singularName: t.singularName, icon: t.icon, sortOrder: t.sortOrder })),
              dashboards: a.dashboards.map((d) => ({ id: d.id, name: d.name, sortOrder: d.sortOrder })),
            })),
          }}
          user={{
          name: currentUser?.name || session.name,
          email: currentUser?.email || session.email,
          avatarUrl: currentUser?.avatarUrl || session.avatarUrl || null,
        }}
          userRole={userRole}
        />

        {/* 3. Hlavní pracovní plocha */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}
