// ── Builder catalog types (Django) ──────────────────────────────────────────

export interface ShapePort {
  id: string;
  x: number;
  y: number;
  side: "top" | "right" | "bottom" | "left";
  kind: "source" | "target" | "both";
}

export type PropertyType = "string" | "text" | "number" | "boolean" | "select";

export interface ShapePropertyField {
  name: string;
  label: string;
  type: PropertyType;
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
}

export interface ShapeDefinition {
  id: string;
  slug: string;
  label: string;
  description: string;
  kind: string;
  svg_path: string;
  viewbox: string;
  default_label: string;
  default_width: number;
  default_height: number;
  default_style: Record<string, unknown>;
  ports: ShapePort[];
  property_schema: ShapePropertyField[];
  category_slug: string;
  order: number;
  is_active: boolean;
}

export interface ShapeCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  order: number;
  is_active: boolean;
  shapes: ShapeDefinition[];
}

export interface NavItem {
  id: string;
  slug: string;
  label: string;
  icon: string;
  href: string;
  section: string;
  min_role: "AUDITOR" | "ADMIN";
  order: number;
}

export interface DashboardWidget {
  id: string;
  slug: string;
  label: string;
  icon: string;
  kind: "stat" | "chart" | "list" | "card";
  value: string;
  query: string;
  color_class: string;
  order: number;
}

// ── Builder workflow types (Django) ─────────────────────────────────────────

export interface BuilderSopVersion {
  activation_status: string | null;
  is_current: boolean;
  version_number: number;
  current_sop_id: number | null;
  is_approved: boolean;
}

export interface BuilderSopStatus {
  job_id: string;
  seed_url: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "PARTIAL" | string;
  docs_processed: number;
  docs_failed: number;
  created_at: string;
  completed_at: string | null;
  audit_sop_id: number | null;
  sop_version?: BuilderSopVersion | null;
}

export interface BuilderAttachedAgent {
  name: string;
  url: string;
  method: string;
  auth_type: "none" | "bearer" | "api_key" | "basic" | string;
  description: string;
  endpoint_id: string;
}

export interface BuilderWorkflow {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  owner_id: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
  sops?: BuilderSopStatus[];
  attached_agents?: BuilderAttachedAgent[];
}

export interface BuilderShape {
  id: string;
  definition_slug: string;
  label: string;
  description: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
  properties: Record<string, unknown>;
  order: number;
}

export interface BuilderWorkbench {
  id: string;
  name: string;
  description: string;
  node_key: string;
  kind: string;
  config: Record<string, unknown>;
  order: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
  shapes: BuilderShape[];
}

export interface BuilderWorkArea {
  id: string;
  name: string;
  description: string;
  order: number;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  metadata: Record<string, unknown>;
  workbenches: BuilderWorkbench[];
}

export interface BuilderConnection {
  id: string;
  source_shape: string;
  target_shape: string;
  source_port: string;
  target_port: string;
  label: string;
  condition_label: string;
  waypoints: unknown[];
  style: Record<string, unknown>;
}

export interface BuilderGraph extends BuilderWorkflow {
  work_areas: BuilderWorkArea[];
  connections: BuilderConnection[];
}
