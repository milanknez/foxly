import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "foxly_dev_jwt_secret_change_in_production";
const COOKIE_NAME = "foxly_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isSystemAdmin: boolean;
  workspaceId?: string;
  role?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: SessionUser): string {
  // Očistíme případné existující exp a iat z dekódovaného tokenu
  const { exp, iat, ...cleanPayload } = payload as any;
  return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(user: SessionUser) {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  try {
    cookieStore.delete(COOKIE_NAME);
  } catch {}
  try {
    cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  } catch {}
}

// Scoped Tenant Helper: ověří, že uživatel patří do workspace
export async function requireWorkspaceMember(workspaceSlugOrId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const workspace = await db.workspace.findFirst({
    where: {
      OR: [{ id: workspaceSlugOrId }, { slug: workspaceSlugOrId }],
    },
    include: {
      members: {
        where: { userId: session.id },
      },
    },
  });

  if (!workspace || (!session.isSystemAdmin && workspace.members.length === 0)) {
    throw new Error("FORBIDDEN");
  }

  const member = workspace.members[0];
  return {
    user: session,
    workspace,
    role: session.isSystemAdmin ? "OWNER" : member?.role || "MEMBER",
    member,
  };
}
