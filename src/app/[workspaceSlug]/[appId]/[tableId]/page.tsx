import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMemberTablePermission } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import TableViewClient from "./table-view-client";

export default async function TablePage({
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

  // Ověření oprávnění uživatele k této tabulce
  const perm = await getMemberTablePermission(session.id, tableId);
  if (!perm.canRead) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-100 min-h-[500px]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Přístup k tabulce omezen</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            K této tabulce nemáte nastavená práva pro prohlížení. Pokud potřebujete přístup, kontaktujte administrátora vaší firmy.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={`/${workspaceSlug}`}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Zpět na přehled firmy
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Načtení definice tabulky, sloupců, záznamů, pohledů a automatizací
  const table = await db.table.findUnique({
    where: { id: tableId },
    include: {
      columns: {
        orderBy: { sortOrder: "asc" },
      },
      records: {
        where: perm.onlyOwnRecords ? { createdById: session.id } : undefined,
        orderBy: { createdAt: "desc" },
      },
      views: true,
      automations: true,
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

  // Zjistíme, zda existuje formulářový pohled pro veřejný formulář / iframe
  const formView = table.views.find((v) => v.type === "FORM");

  return (
    <TableViewClient
      table={JSON.parse(JSON.stringify(table))}
      publicFormShareToken={formView?.isPublic ? formView.shareToken : null}
      initialFormView={formView ? JSON.parse(JSON.stringify(formView)) : null}
      workspaceSlug={workspaceSlug}
      appId={appId}
      userPermissions={perm}
    />
  );
}
