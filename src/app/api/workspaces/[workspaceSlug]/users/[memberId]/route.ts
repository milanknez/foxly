import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

// 1. Získání detailu zaměstnance a jeho oprávnění
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug, memberId } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: { where: { userId: session.id } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const currentMember = workspace.members[0];
    if (!session.isSystemAdmin && !currentMember) {
      return NextResponse.json({ error: "Nemáte přístup k této firmě" }, { status: 403 });
    }

    const member = await db.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        tablePermissions: true,
      },
    });

    if (!member || member.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error("GET workspace member error:", error);
    return NextResponse.json({ error: "Chyba při načítání zaměstnance" }, { status: 500 });
  }
}

// 2. Úprava role, pozice, hesla a matice oprávnění zaměstnance
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug, memberId } = await params;
    const body = await request.json();
    const { name, role, jobTitle, password, allowedAppIds, tablePermissions } = body;

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: { where: { userId: session.id } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const currentMember = workspace.members[0];
    if (!session.isSystemAdmin && currentMember?.role !== "OWNER" && currentMember?.role !== "ADMIN") {
      return NextResponse.json({ error: "Pouze administrátor nebo vlastník může měnit oprávnění" }, { status: 403 });
    }

    const targetMember = await db.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!targetMember || targetMember.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
    }

    // Bezpečnost: Vlastníka nemůže sesadit běžný administrátor
    if (targetMember.role === "OWNER" && !session.isSystemAdmin && currentMember?.role !== "OWNER") {
      return NextResponse.json({ error: "Oprávnění vlastníka může měnit pouze vlastník firmy" }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      // Aktualizace uživatelského jména nebo hesla, pokud bylo předáno
      if (name && name !== targetMember.user.name) {
        await tx.user.update({
          where: { id: targetMember.userId },
          data: { name },
        });
      }

      if (password && password.trim().length > 0) {
        const passwordHash = await hashPassword(password);
        await tx.user.update({
          where: { id: targetMember.userId },
          data: { passwordHash },
        });
      }

      // Aktualizace údajů o členství (role, pozice, povolené aplikace)
      const updateData: Record<string, unknown> = {};
      if (role !== undefined) updateData.role = role;
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
      if (Array.isArray(allowedAppIds)) updateData.allowedAppIds = allowedAppIds;

      await tx.workspaceMember.update({
        where: { id: memberId },
        data: updateData,
      });

      // Aktualizace matice oprávnění pro tabulky
      if (Array.isArray(tablePermissions)) {
        for (const tp of tablePermissions) {
          if (!tp.tableId || !tp.permissionLevel) continue;

          await tx.memberTablePermission.upsert({
            where: {
              memberId_tableId: {
                memberId,
                tableId: tp.tableId,
              },
            },
            update: {
              permissionLevel: tp.permissionLevel,
            },
            create: {
              memberId,
              tableId: tp.tableId,
              permissionLevel: tp.permissionLevel,
            },
          });
        }
      }
    });

    const updatedMember = await db.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tablePermissions: true,
      },
    });

    return NextResponse.json({ success: true, member: updatedMember });
  } catch (error) {
    console.error("Update workspace member error:", error);
    return NextResponse.json({ error: "Chyba při ukládání oprávnění zaměstnance" }, { status: 500 });
  }
}

// 3. Odebrání zaměstnance z firmy
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug, memberId } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const currentMember = workspace.members.find((m) => m.userId === session.id);
    if (!session.isSystemAdmin && currentMember?.role !== "OWNER" && currentMember?.role !== "ADMIN") {
      return NextResponse.json({ error: "Pouze administrátor nebo vlastník může odebírat zaměstnance" }, { status: 403 });
    }

    const targetMember = workspace.members.find((m) => m.id === memberId);
    if (!targetMember) {
      return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
    }

    // Ochrana před smazáním jediného vlastníka
    if (targetMember.role === "OWNER") {
      const ownerCount = workspace.members.filter((m) => m.role === "OWNER").length;
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Nelze odebrat jediného vlastníka firmy" }, { status: 400 });
      }
    }

    await db.workspaceMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workspace member error:", error);
    return NextResponse.json({ error: "Chyba při odebírání zaměstnance" }, { status: 500 });
  }
}
