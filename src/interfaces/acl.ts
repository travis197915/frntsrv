// ── ACL types (Node corebackend — /api/roles, /api/permissions) ────────────

export interface AclRole {
  id: string;
  name: string;
  description: string;
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
