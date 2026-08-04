export type UserRole = "ADMIN" | "OWNER" | "CUSTOMER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isBanned: boolean;
}

// Central permission map — single source of truth for "who can do what".
// UI and route handlers both check against this instead of duplicating role logic.
export const PERMISSIONS = {
  villa: {
    create: ["ADMIN"],
    edit: ["ADMIN"],
    delete: ["ADMIN"],
  },
  calendar: {
    manage: ["ADMIN", "OWNER"], // OWNER access can be disabled per system setting (spec'te belirtilen kural)
  },
  booking: {
    create: ["ADMIN", "CUSTOMER"],
    cancel: ["ADMIN", "OWNER", "CUSTOMER"],
    refund: ["ADMIN"],
  },
  user: {
    manage: ["ADMIN"],
    ban: ["ADMIN"],
  },
  settings: {
    manage: ["ADMIN"],
  },
} as const satisfies Record<string, Record<string, readonly UserRole[]>>;

export function hasPermission(
  role: UserRole,
  domain: keyof typeof PERMISSIONS,
  action: string,
): boolean {
  const allowed = (PERMISSIONS[domain] as Record<string, readonly UserRole[]>)[action];
  return allowed ? allowed.includes(role) : false;
}
