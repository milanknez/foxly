import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  const res = NextResponse.json({ success: true });
  res.cookies.set("foxly_session", "", { path: "/", maxAge: 0, expires: new Date(0) });
  return res;
}

export async function GET(request: Request) {
  await clearSessionCookie();
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/login", url.origin));
  res.cookies.set("foxly_session", "", { path: "/", maxAge: 0, expires: new Date(0) });
  return res;
}
