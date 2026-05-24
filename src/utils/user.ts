export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type RoleRequirement = "ADMIN" | "USER";

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

export function getRoleLabel(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "USER":
      return "Member";
    default:
      return role;
  }
}
