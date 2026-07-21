// ── Identity types (Node corebackend) ───────────────────────────────────────

export interface CorebackendUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "AUDITOR";
  /** Flattened resource-scoped grants from the user's Role — drives hasPermission(). */
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: CorebackendUser;
}
