import { NextResponse } from "next/server";
import { getSession, comparePassword, hashPassword, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

// 1. Získání profilu přihlášeného uživatele
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isSystemAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("GET user profile error:", error);
    return NextResponse.json({ error: "Chyba při načítání profilu" }, { status: 500 });
  }
}

// 2. Aktualizace vlastního profilu, avataru a změna hesla
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatarUrl, currentPassword, newPassword } = body;

    const currentUser = await db.user.findUnique({
      where: { id: session.id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      avatarUrl?: string | null;
      passwordHash?: string;
    } = {};

    // Úprava jména
    if (typeof name === "string") {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        return NextResponse.json({ error: "Jméno musí mít alespoň 2 znaky" }, { status: 400 });
      }
      updateData.name = cleanName;
    }

    // Úprava avataru (URL nebo base64, případně prázdné pro smazání)
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
    }

    // Změna hesla
    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json({ error: "Nové heslo musí mít alespoň 6 znaků" }, { status: 400 });
      }

      if (!currentPassword) {
        return NextResponse.json({ error: "Pro změnu hesla zadejte Vaše stávající heslo" }, { status: 400 });
      }

      const isPasswordValid = await comparePassword(currentPassword, currentUser.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Stávající heslo není správné" }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    // Uložení do databáze
    const updated = await db.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isSystemAdmin: true,
      },
    });

    // Aktualizace session cookie s novým jménem / avatarem
    await setSessionCookie({
      ...session,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Profil byl úspěšně aktualizován",
      user: updated,
    });
  } catch (error) {
    console.error("PATCH user profile error:", error);
    return NextResponse.json({ error: "Chyba při ukládání profilu" }, { status: 500 });
  }
}
