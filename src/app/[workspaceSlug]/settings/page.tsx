import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceStorageStats } from "@/lib/storage";
import WorkspaceSettingsClient from "./workspace-settings-client";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug } = await params;

  const [workspace, currentUser, storageUsage] = await Promise.all([
    db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          include: { user: true },
        },
        apps: {
          include: {
            tables: {
              include: {
                _count: { select: { records: true, columns: true } },
              },
            },
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, avatarUrl: true },
    }),
    getWorkspaceStorageStats(workspaceSlug),
  ]);

  if (!workspace) {
    notFound();
  }

  const userMembership = workspace.members.find((m) => m.userId === session.id);
  const userRole = session.isSystemAdmin ? "SUPERADMIN" : userMembership?.role || "MEMBER";

  return (
    <WorkspaceSettingsClient
      workspace={JSON.parse(JSON.stringify(workspace))}
      userRole={userRole}
      currentUser={currentUser ? JSON.parse(JSON.stringify(currentUser)) : null}
      storageUsage={storageUsage}
    />
  );
}
