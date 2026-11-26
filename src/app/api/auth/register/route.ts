import { NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { name, email, password, companyName } = await request.json();

    if (!name || !email || !password || !companyName) {
      return NextResponse.json({ error: "Vyplňte všechna povinná pole" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Uživatel s tímto e-mailem již existuje" }, { status: 400 });
    }

    const baseSlug = companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug || "firma";
    let counter = 1;
    while (await db.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const passwordHash = await hashPassword(password);

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: companyName,
          slug,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
              jobTitle: "Jednatel / Zakladatel",
            },
          },
          apps: {
            create: {
              name: "Základní Aplikace",
              description: "Moje první aplikace",
              icon: "LayoutGrid",
              tables: {
                create: {
                  name: "Moje první tabulka",
                  singularName: "Záznam",
                  columns: {
                    create: [
                      {
                        key: "fld_nazev",
                        label: "Název",
                        type: "TEXT",
                        isPrimary: true,
                        isRequired: true,
                        sortOrder: 1,
                      },
                      {
                        key: "fld_popis",
                        label: "Popis",
                        type: "LONG_TEXT",
                        sortOrder: 2,
                      },
                      {
                        key: "fld_datum",
                        label: "Datum",
                        type: "DATE",
                        sortOrder: 3,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      });

      return { user, workspace };
    });

    await setSessionCookie({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      isSystemAdmin: false,
      workspaceId: result.workspace.id,
      role: "OWNER",
    });

    return NextResponse.json({
      success: true,
      workspaceSlug: result.workspace.slug,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Chyba při zakládání účtu" }, { status: 500 });
  }
}
