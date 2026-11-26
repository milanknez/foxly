import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

  // 1. Ignorovat statické soubory, Next.js assets, API a veřejné formuláře
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/share") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Extrakce subdomény z hostname
  const hostWithoutPort = hostname.split(":")[0].toLowerCase();

  let subdomain: string | null = null;
  if (hostWithoutPort.endsWith(".foxly.cz")) {
    const candidate = hostWithoutPort.replace(".foxly.cz", "");
    if (candidate && candidate !== "www" && candidate !== "app") {
      subdomain = candidate;
    }
  } else if (hostWithoutPort.endsWith(".localhost")) {
    const candidate = hostWithoutPort.replace(".localhost", "");
    if (candidate && candidate !== "www" && candidate !== "app") {
      subdomain = candidate;
    }
  }

  // 3. Pokud je detekována subdoména (např. fidamedia.foxly.cz)
  if (subdomain) {
    // Přihlášení a registrace zůstávají přístupné
    if (url.pathname === "/login" || url.pathname === "/register") {
      return NextResponse.next();
    }

    // Pokud URL nezačíná subdoménou, interně přepíšeme na /[workspaceSlug]/...
    if (!url.pathname.startsWith(`/${subdomain}`)) {
      url.pathname = `/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
