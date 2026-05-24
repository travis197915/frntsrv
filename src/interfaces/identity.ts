// ── Identity types (Node corebackend) ───────────────────────────────────────

export interface CorebackendUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: CorebackendUser;
}
