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

/**
 * The change set that owns a pending SOP version.
 *
 * A version raised by a workflow upload is adopted by approving its change
 * set — that is what repoints the canvas. The document-level activate/reject
 * buttons bypass the rollout, which would leave the badges saying "current"
 * while the canvas still ran the old version.
 */
export interface BuilderSopChangeSet {
  id: number;
  status: string;
  proposal_count: number;
}

export interface BuilderSopVersion {
  activation_status: string | null;
  is_current: boolean;
  version_number: number;
  current_sop_id: number | null;
  is_approved: boolean;
  change_set?: BuilderSopChangeSet | null;
}

/** One SOP slot inside a frozen WorkflowVersion snapshot. */
export interface WorkflowVersionSop {
  node_key: string;
  order: number;
  sop_title: string;
  audit_sop_id: number;
  sop_version_number: number;
  workbench_id: string;
  workbench_version: number;
}

/** One rule's frozen configuration within a WorkflowVersion snapshot — SOP-
 *  derived (with or without a manual condition/action override) or fully
 *  custom (`custom:{uuid}`, is_custom=true). */
export interface WorkflowVersionRule {
  shape_id: string;
  shape_label: string;
  workbench_id: string;
  node_key: string;
  rule_key: string;
  is_custom: boolean;
  condition: string;
  action: string;
  decision_type: string;
  codes: string[];
  subrule_id: string;
  sop_id: number | null;
  sop_title: string;
  sop_version_number: number | null;
  orphaned_from_rule_key: string;
  orphaned_from_sop_id: number | null;
  orphaned_reason: string;
  ordering: number;
}

/** A frozen snapshot of a workflow's SOP composition — one row from
 *  GET /workflows/{id}/versions/ or GET /workflows/{id}/versions/{n}/. */
export interface WorkflowVersion {
  workflow_version: number;
  created_at: string;
  reason: string;
  sops: WorkflowVersionSop[];
  rules: WorkflowVersionRule[];
}

/** What the rollout will do to one bound rule if this version is approved. */
export interface SopVersionPreviewRule {
  action: 'repoint' | 'drop' | 'strand';
  new_rule_key: string | null;
  condition: string;
  action_text: string;
  refreshed: boolean;
  preserved: boolean;
}

export interface SopVersionPreviewNode {
  label: string;
  workbench: string;
  order: number;
}

export interface SopVersionPreviewUnplaced {
  rule_key: string;
  step_number: number;
  row_index: number;
  subrule_id: string;
  condition: string;
  action: string;
}

/**
 * A projection of the canvas onto one SOP version.
 *
 * `projected` is false for the version the workflow is already running — the
 * live canvas already *is* that version, so there is nothing to overlay.
 */
export interface SopVersionPreview {
  workflow_id: string;
  sop_id: number;
  version_number: number;
  activation_status: string | null;
  is_current: boolean;
  readonly: boolean;
  projected: boolean;
  from_sop_id?: number;
  from_version_number?: number;
  change_set: BuilderSopChangeSet | null;
  shapes: Record<string, SopVersionPreviewNode>;
  rules: Record<string, Record<string, SopVersionPreviewRule>>;
  unplaced: SopVersionPreviewUnplaced[];
  report: {
    repointed: number;
    refreshed: number;
    preserved: number;
    dropped: number;
    stranded: number;
    unplaced_count: number;
  } | null;
  detail?: string;
}

/** Result of starting a review batch that rolls this workflow onto a newer
 *  SOP version — the on-demand counterpart to an ingestion-triggered
 *  rollout, for a workflow whose bindings never got repointed automatically. */
export interface SopVersionAdoptResult {
  change_set_id: number | null;
  from_sop_id?: number;
  to_sop_id?: number;
  proposal_count?: number;
  detail?: string;
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
  /** Bumped whenever any Workbench under this workflow gets a content version
   *  bump (a SOP's bound content changed and a new Workbench row was
   *  appended). Distinct from `BuilderSopVersion.version_number`, which is a
   *  per-SOP-document revision count. */
  version: number;
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
  /** Content version of this Workbench slot — bumps only when the SOP bound
   *  to it actually changes and a new row is appended (old one kept, not
   *  live). Independent of `BuilderSopVersion` (the SOP-document version). */
  version: number;
  /** False once superseded by a newer version of the same slot. The graph/
   *  sop-order endpoints only ever return `is_current: true` rows, so this
   *  is effectively always true here — kept for forward-compat with a future
   *  history view. */
  is_current: boolean;
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
