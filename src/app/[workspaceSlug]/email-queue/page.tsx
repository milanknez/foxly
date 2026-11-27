import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import EmailQueueClient from "./email-queue-client";

export default async function EmailQueuePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug } = await params;

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.id },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  const userRole = session.isSystemAdmin
    ? "SUPERADMIN"
    : workspace.members[0]?.role || "MEMBER";

  return (
    <EmailQueueClient
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        companyDetails: (workspace.companyDetails as Record<string, any>) || {},
        plugins: (Array.isArray(workspace.plugins) ? workspace.plugins : []) as string[],
      }}
      userRole={userRole}
    />
  );
}
