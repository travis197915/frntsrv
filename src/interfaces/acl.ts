// ── ACL types (Node corebackend — /api/roles, /api/permissions) ────────────

export interface AclRole {
  id: string;
  name: string;
  description: string;
  /** Entra ID App Role `value` this role auto-maps from on Microsoft SSO login. Null = never auto-assigned. */
  entraAppRole: string | null;
  /** Tie-breaker when a login's `roles` claim matches more than one role's entraAppRole. Higher wins. */
  precedence: number;
  /** Flattened grant keys currently assigned to this role. */
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AclPermission {
  id: string;
  key: string;
  description: string;
  createdAt: string;
}
