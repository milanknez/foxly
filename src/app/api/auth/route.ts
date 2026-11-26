import { NextResponse } from "next/server";
import { comparePassword, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        isSystemAdmin: true,
        memberships: {
          include: {
            workspace: {
              include: {
                apps: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    tables: {
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ user, session });
  } catch (error) {
    console.error("GET session error:", error);
    return NextResponse.json({ error: "Chyba při načítání relace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Vyplňte e-mail a heslo" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await db.user.findUnique({
      where: { email: cleanEmail },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user && cleanEmail === "admin@foxly.local") {
      user = await db.user.findFirst({
        where: { email: "admin@foxly.local" },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Neplatné přihlašovací údaje" }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Neplatné přihlašovací údaje" }, { status: 401 });
    }

    const defaultWorkspace = user.memberships[0]?.workspace;

    await setSessionCookie({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isSystemAdmin: user.isSystemAdmin,
      workspaceId: defaultWorkspace?.id,
      role: user.memberships[0]?.role,
    });

    return NextResponse.json({
      success: true,
      workspaceSlug: defaultWorkspace?.slug || "setup",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Chyba serveru při přihlášení" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
