import { db } from "./db";

export type PermissionLevel = "FULL_ACCESS" | "READ_WRITE" | "OWN_RECORDS" | "READ_ONLY" | "NO_ACCESS";

export interface UserTablePermission {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageSchema: boolean;
  onlyOwnRecords: boolean;
  level: PermissionLevel;
  role: string;
}

/**
 * Zjistí oprávnění daného uživatele k určité tabulce.
 * Bere v potaz:
 * 1. Systémového administrátora (vždy plný přístup)
 * 2. Roli ve firmě (OWNER a ADMIN mají vždy plný přístup)
 * 3. Omezení přístupu k aplikacím (member.allowedAppIds)
 * 4. Specifická pravidla pro tabulku z MemberTablePermission
 * 5. Výchozí chování role MEMBER / VIEWER
 */
export async function getMemberTablePermission(
  userId: string,
  tableId: string
): Promise<UserTablePermission> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, isSystemAdmin: true },
  });

  if (user?.isSystemAdmin) {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canManageSchema: true,
      onlyOwnRecords: false,
      level: "FULL_ACCESS",
      role: "SUPERADMIN",
    };
  }

  const table = await db.table.findUnique({
    where: { id: tableId },
    include: {
      app: {
        include: {
          workspace: {
            include: {
              members: {
                where: { userId },
                include: {
                  tablePermissions: {
                    where: { tableId },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!table) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canManageSchema: false,
      onlyOwnRecords: false,
      level: "NO_ACCESS",
      role: "NONE",
    };
  }

  const member = table.app.workspace.members[0];
  if (!member) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canManageSchema: false,
      onlyOwnRecords: false,
      level: "NO_ACCESS",
      role: "NONE",
    };
  }

  // Vlastník a Správce mají neomezený přístup
  if (member.role === "OWNER" || member.role === "ADMIN") {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canManageSchema: true,
      onlyOwnRecords: false,
      level: "FULL_ACCESS",
      role: member.role,
    };
  }

  // 1. Kontrola omezení na konkrétní aplikace
  if (Array.isArray(member.allowedAppIds) && member.allowedAppIds.length > 0) {
    if (!member.allowedAppIds.includes(table.appId)) {
      return {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canManageSchema: false,
        onlyOwnRecords: false,
        level: "NO_ACCESS",
        role: member.role,
      };
    }
  }

  // 2. Kontrola specifického oprávnění na tabulku
  const tablePerm = member.tablePermissions[0];
  const level: PermissionLevel = (tablePerm?.permissionLevel as PermissionLevel) || (member.role === "VIEWER" ? "READ_ONLY" : "FULL_ACCESS");

  switch (level) {
    case "NO_ACCESS":
      return {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canManageSchema: false,
        onlyOwnRecords: false,
        level: "NO_ACCESS",
        role: member.role,
      };

    case "READ_ONLY":
      return {
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canManageSchema: false,
        onlyOwnRecords: false,
        level: "READ_ONLY",
        role: member.role,
      };

    case "OWN_RECORDS":
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
        canManageSchema: false,
        onlyOwnRecords: true,
        level: "OWN_RECORDS",
        role: member.role,
      };

    case "READ_WRITE":
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
        canManageSchema: false,
        onlyOwnRecords: false,
        level: "READ_WRITE",
        role: member.role,
      };

    case "FULL_ACCESS":
    default:
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canManageSchema: false,
        onlyOwnRecords: false,
        level: "FULL_ACCESS",
        role: member.role,
      };
  }
}
