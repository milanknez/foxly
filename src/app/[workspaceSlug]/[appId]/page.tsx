import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Table as TableIcon, Layers, FileSpreadsheet } from "lucide-react";

export default async function AppOverviewPage({
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
      },
      dashboards: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!app || app.workspace.slug !== workspaceSlug) {
    notFound();
  }

  // Pokud aplikace má tabulku, přesměrujeme rovnou na první tabulku
  if (app.tables.length > 0) {
    redirect(`/${workspaceSlug}/${appId}/${app.tables[0].id}`);
  }

  // Pokud má dashboard, přesměrujeme na dashboard
  if (app.dashboards.length > 0) {
    redirect(`/${workspaceSlug}/${appId}/dashboard/${app.dashboards[0].id}`);
  }

  // Jinak zobrazíme uvítací stránku prázdné aplikace
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md"
          style={{ backgroundColor: app.color || "#2563eb" }}
        >
          <Layers className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">{app.name}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {app.description || "Tato aplikace zatím neobsahuje žádné datové tabulky."}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Link
            href={`/${workspaceSlug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Vytvořit tabulku v levém panelu
          </Link>
        </div>
      </div>
    </div>
  );
}
