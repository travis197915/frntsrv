// ── Identity types (Node corebackend) ───────────────────────────────────────

export interface CorebackendUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "AUDITOR";
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: CorebackendUser;
}
