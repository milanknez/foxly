import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ScrapersClient from "./scrapers-client";

export default async function ScrapersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; appId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { workspaceSlug, appId } = await params;

  const app = await db.app.findUnique({
    where: { id: appId },
    include: {
      workspace: true,
      tables: {
        include: {
          columns: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!app || app.workspace.slug !== workspaceSlug) {
    notFound();
  }

  // Načtení existujících scraperů pro tuto aplikaci
  const scrapers = await db.automation.findMany({
    where: {
      table: { appId },
      triggerType: "SCHEDULED_SCRAPE",
    },
    include: {
      table: {
        select: {
          id: true,
          name: true,
          singularName: true,
          columns: {
            select: { id: true, key: true, label: true, type: true },
          },
        },
      },
      executionLogs: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ScrapersClient
      app={{
        id: app.id,
        name: app.name,
        tables: app.tables.map((t) => ({
          id: t.id,
          name: t.name,
          singularName: t.singularName,
          columns: t.columns.map((c) => ({
            id: c.id,
            key: c.key,
            label: c.label,
            type: c.type,
          })),
        })),
      }}
      initialScrapers={JSON.parse(JSON.stringify(scrapers))}
      workspaceSlug={workspaceSlug}
      appId={appId}
    />
  );
}
