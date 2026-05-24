// ── SOP graph types ────────────────────────────────────────────────────────

export type SopGraphNodeType =
  | "DOCUMENT"
  | "META"
  | "PRE_SECTION"
  | "PRE_RULE"
  | "STEP"
  | "DECISION"
  | "ANNOTATION"
  | "CODE"
  | "GROUP_LIMIT"
  | "DATE_COND"
  | "REFERENCE"
  | string;

export interface SopGraphNode {
  id: string;
  label: string;
  type: SopGraphNodeType;
  details: Record<string, unknown>;
  ref_table: string;
  ref_id: number | null;
  display_order: number;
}

export interface SopGraphEdge {
  id: string;
  source: string;
  target: string;
  rel: string;
  label: string;
  details: Record<string, unknown>;
}

export interface SopGraphResponse {
  sop_id: number | null;
  seed_url: string;
  status: string;
  nodes: SopGraphNode[];
  edges: SopGraphEdge[];
}

// ── SOP sections (tabular view) ────────────────────────────────────────────

export interface SopRule {
  condition?: string;
  action?: string;
  section?: string;
  is_exception?: boolean;
  decision_type?: string;
  [key: string]: unknown;
}

export interface SopPrecondition {
  id: number;
  order: number;
  category: string;
  label: string;
  content_text: string;
  is_blocking: boolean;
  rules: SopRule[];
}

export interface SopDecision {
  row_index: number;
  condition_if: string;
  condition_and: string;
  action_text: string;
  action_summary: string;
  decision_type: string;
  goto_step: number | null;
  is_final: boolean;
  eob_codes: string[];
  ex_codes: string[];
  denial_codes: string[];
  system_actions: string[];
  all_codes: string[];
}

export interface SopStep {
  step_number: number;
  question: string;
  intro_text: string;
  is_terminal: boolean;
  terminal_action: string;
  is_sub_procedure: boolean;
  sub_procedure: string;
  decisions: SopDecision[];
}

export interface SopCode {
  value: string;
  type: string;
  description: string;
  context: string;
  source_step: number | null;
}

export interface SopGroupLimit {
  group_name: string;
  inn_days: number | null;
  oon_days: number | null;
  limit_days: number | null;
  basis: string;
  network_type: string;
  exceptions: string[];
  special_notes: string[];
}

export interface SopAnnotation {
  type: string;
  content_text: string;
  is_claim_impact: boolean;
  step_number: number | null;
}

export interface SopReference {
  ref_text: string;
  ref_url: string;
  ref_type: string;
  is_resolved: boolean;
  step_number: number | null;
}

export interface SopSectionsResponse {
  sop_id: number | null;
  seed_url: string;
  status: string;
  title: string;
  purpose: string;
  summary: string;
  platform: string;
  lob: string[];
  preconditions: SopPrecondition[];
  steps: SopStep[];
  codes: SopCode[];
  group_limits: SopGroupLimit[];
  annotations: SopAnnotation[];
  references: SopReference[];
}

// ── SOP user-curated exclusions ─────────────────────────────────────────────

export type SopExclusionTargetKind =
  | "rule"
  | "step"
  | "section"
  | "sop"
  | "graph_node"
  | "html_block";

export interface SopExclusion {
  id: number;
  sop_id: number;
  target_kind: SopExclusionTargetKind;
  target_key: string;
  label: string;
  reason: string;
  snippet_text: string;
  metadata: Record<string, unknown>;
  created_by_id: string;
  created_by_email: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface SopExclusionListResponse {
  sop_id: number;
  count: number;
  results: SopExclusion[];
}

export interface SopExclusionToggleResponse {
  sop_id: number;
  target_kind: SopExclusionTargetKind;
  target_key: string;
  excluded: boolean;
  exclusion?: SopExclusion;
}

export interface SopExclusionUpsertInput {
  target_kind: SopExclusionTargetKind;
  target_key: string;
  label?: string;
  reason?: string;
  snippet_text?: string;
  metadata?: Record<string, unknown>;
}

// ── SOP HTML section blocks ─────────────────────────────────────────────────

export interface SopHtmlBlock {
  block_id: string;
  kind:
    | "heading"
    | "table"
    | "list"
    | "paragraph"
    | "callout"
    | "code"
    | "metadata"
    | string;
  tag: string;
  label: string;
  html: string;
  text: string;
  depth: number;
  order: number;
  target_kind: "html_block";
  target_key: string;
  is_excluded: boolean;
  exclusion_id: number | null;
}

export interface SopHtmlBlocksResponse {
  sop_id: number;
  source_url: string;
  doc_format: string;
  count: number;
  blocks: SopHtmlBlock[];
}

export interface SopSourceHtmlResponse {
  sop_id: number;
  doc_format: string;
  source_url: string;
  available: boolean;
  html: string;
  reason: string;
  excluded_target_keys: string[];
}
