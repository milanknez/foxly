import crypto from "crypto";
import { db } from "@/lib/db";

export interface ApiAuthResult {
  authenticated: boolean;
  apiKey?: any;
  workspaceId?: string;
  error?: string;
  status?: number;
}

/**
 * Generuje bezpečný API token začínající na `foxly_live_`
 */
export function generateApiToken(): { token: string; keyHash: string; maskedKey: string } {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const token = `foxly_live_${randomBytes}`;
  const keyHash = hashApiToken(token);
  const maskedKey = `foxly_live_${randomBytes.slice(0, 4)}••••${randomBytes.slice(-4)}`;
  return { token, keyHash, maskedKey };
}

/**
 * SHA-256 hash pro bezpečné uložení v DB
 */
export function hashApiToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Ověří Bearer token z HTTP hlavičky požadavku
 */
export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult> {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (!authHeader) {
    return {
      authenticated: false,
      error: "Chybí autentizační hlavička 'Authorization: Bearer <token>' nebo 'x-api-key'",
      status: 401,
    };
  }

  let token = authHeader.trim();
  if (token.startsWith("Bearer ") || token.startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (!token.startsWith("foxly_live_") && !token.startsWith("foxly_test_")) {
    return {
      authenticated: false,
      error: "Neplatný formát API tokenu (musí začínat na 'foxly_live_')",
      status: 401,
    };
  }

  const keyHash = hashApiToken(token);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!apiKey) {
    return {
      authenticated: false,
      error: "API klíč nebyl nalezen nebo byl odvolán",
      status: 401,
    };
  }

  // Kontrola expirace
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return {
      authenticated: false,
      error: `Platnost tohoto API klíče vypršela dne ${new Date(apiKey.expiresAt).toLocaleDateString("cs-CZ")}`,
      status: 403,
    };
  }

  return {
    authenticated: true,
    apiKey,
    workspaceId: apiKey.workspaceId,
  };
}
