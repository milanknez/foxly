import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PublicFormClient from "./public-form-client";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const view = await db.view.findUnique({
    where: { shareToken },
    include: {
      table: {
        include: {
          columns: { orderBy: { sortOrder: "asc" } },
          app: {
            include: { workspace: true },
          },
        },
      },
    },
  });

  if (!view || !view.isPublic) {
    notFound();
  }

  const { table } = view;
  const { workspace } = table.app;
  const config = (view.config as Record<string, unknown>) || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <PublicFormClient
          shareToken={shareToken}
          title={(config.title as string) || view.name}
          description={(config.description as string) || ""}
          companyName={workspace.name}
          columns={JSON.parse(JSON.stringify(table.columns))}
          config={config}
        />
      </div>
    </div>
  );
}
