import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SchemaBuilderClient from "./schema-builder-client";

export default async function TableSettingsPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    appId: string;
    tableId: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug, appId, tableId } = await params;

  const table = await db.table.findUnique({
    where: { id: tableId },
    include: {
      columns: {
        orderBy: { sortOrder: "asc" },
      },
      app: {
        include: {
          workspace: true,
        },
      },
    },
  });

  if (!table || table.app.workspace.slug !== workspaceSlug) {
    notFound();
  }

  return (
    <SchemaBuilderClient
      table={JSON.parse(JSON.stringify(table))}
      workspaceSlug={workspaceSlug}
      appId={appId}
    />
  );
}
