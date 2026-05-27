export type UserRole = "ADMIN" | "AUDITOR";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type RoleRequirement = "ADMIN" | "AUDITOR";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
