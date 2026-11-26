import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

// 1. Získání seznamu zaměstnanců firmy a aplikací se strukturou tabulek
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                isSystemAdmin: true,
              },
            },
            tablePermissions: true,
          },
          orderBy: { createdAt: "asc" },
        },
        apps: {
          orderBy: { sortOrder: "asc" },
          include: {
            tables: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                singularName: true,
                icon: true,
                appId: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const currentMember = workspace.members.find((m) => m.userId === session.id);
    if (!session.isSystemAdmin && !currentMember) {
      return NextResponse.json({ error: "Nemáte přístup k této firmě" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      members: workspace.members,
      apps: workspace.apps,
      currentUserId: session.id,
      currentUserRole: session.isSystemAdmin ? "SUPERADMIN" : currentMember?.role || "MEMBER",
    });
  } catch (error) {
    console.error("GET workspace users error:", error);
    return NextResponse.json({ error: "Chyba při načítání zaměstnanců" }, { status: 500 });
  }
}

// 2. Vytvoření nového zaměstnance ve firmě (Workspace) administrátorem
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { workspaceSlug } = await params;
    const body = await request.json();
    const { name, email, password, role, jobTitle, allowedAppIds, tablePermissions } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Vyplňte jméno, e-mail a dočasné heslo" }, { status: 400 });
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: { where: { userId: session.id } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Firma nenalezena" }, { status: 404 });
    }

    const currentUserMember = workspace.members[0];
    if (!session.isSystemAdmin && currentUserMember?.role !== "OWNER" && currentUserMember?.role !== "ADMIN") {
      return NextResponse.json({ error: "Pouze administrátor může přidávat zaměstnance" }, { status: 403 });
    }

    let user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      const passwordHash = await hashPassword(password);
      user = await db.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          passwordHash,
        },
      });
    }

    const existingMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "Uživatel již je členem této firmy" }, { status: 400 });
    }

    const member = await db.$transaction(async (tx) => {
      const createdMember = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: role || "MEMBER",
          jobTitle: jobTitle || "Zaměstnanec",
          allowedAppIds: Array.isArray(allowedAppIds) ? allowedAppIds : [],
        },
      });

      if (Array.isArray(tablePermissions) && tablePermissions.length > 0) {
        for (const tp of tablePermissions) {
          if (tp.tableId && tp.permissionLevel) {
            await tx.memberTablePermission.create({
              data: {
                memberId: createdMember.id,
                tableId: tp.tableId,
                permissionLevel: tp.permissionLevel,
              },
            });
          }
        }
      }

      return tx.workspaceMember.findUnique({
        where: { id: createdMember.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          tablePermissions: true,
        },
      });
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error("Create workspace user error:", error);
    return NextResponse.json({ error: "Chyba při zakládání zaměstnance" }, { status: 500 });
  }
}
