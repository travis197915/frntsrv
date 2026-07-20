export type UserRole = "ADMIN" | "AUDITOR";
export type UserStatus = "ACTIVE" | "INACTIVE";

/** Wildcard grant — mirrors the backend's WILDCARD_PERMISSION. */
const WILDCARD_PERMISSION = "*";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Flattened resource-scoped grants from the backend — the real ACL source. */
  permissions: string[];
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export function isAdmin(role: UserRole | string): boolean {
  return role === "ADMIN";
}

export function isAuditor(role: UserRole | string): boolean {
  return role === "AUDITOR";
}

/** Only admins may perform write / mutate operations. */
export function canWrite(role: UserRole | string): boolean {
  return isAdmin(role);
}

/** Checks a specific resource-scoped permission key against a user's grants. */
export function hasPermission(permissions: string[], key: string): boolean {
  return permissions.includes(WILDCARD_PERMISSION) || permissions.includes(key);
}

export function getRoleLabel(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "AUDITOR":
      return "Auditor";
    default:
      return role;
  }
}
