import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkflowsClient from "./workflows-client";

export default async function AppWorkflowsPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    appId: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug, appId } = await params;

  const app = await db.app.findUnique({
    where: { id: appId },
    include: {
      workspace: true,
      tables: {
        orderBy: { sortOrder: "asc" },
        include: {
          columns: {
            orderBy: { sortOrder: "asc" },
          },
          records: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          automations: {
            orderBy: { createdAt: "desc" },
            include: {
              executionLogs: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
            },
          },
        },
      },
    },
  });

  if (!app || app.workspace.slug !== workspaceSlug) {
    notFound();
  }

  return (
    <WorkflowsClient
      app={JSON.parse(JSON.stringify(app))}
      workspaceSlug={workspaceSlug}
      userRole={session.isSystemAdmin ? "SUPERADMIN" : "ADMIN"}
    />
  );
}
