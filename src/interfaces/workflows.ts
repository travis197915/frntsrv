import type { BuilderAttachedAgent, BuilderSopStatus } from "./builder";

// ── Auto-build progress (polled while the canvas is generated from SOPs) ───

export type BuildPhase =
  | "idle"
  | "queued"
  | "ingesting"
  | "building"
  | "done"
  | "failed";

export interface BuildStatusJob {
  job_id: string;
  seed_url: string;
  status: string;
  docs_processed: number;
  docs_failed: number;
}

export interface BuildStatusLog {
  stage: string;
  status: string;
  doc_url: string;
  duration_ms: number | null;
  ts: string | null;
  error: string;
}

export interface BuildStatus {
  auto_build: boolean;
  phase: BuildPhase;
  built: boolean;
  needs_tools: boolean;
  shape_count: number;
  stats: { sops: number; shapes: number; rules: number } | null;
  jobs: BuildStatusJob[];
  logs: BuildStatusLog[];
  llm_errors: { error: string }[];
}

// ── Attachable rules + tools (per workflow, for per-node attachments) ──────

export interface AttachableHtmlReference {
  source_url: string;
  doc_format: string;
  anchor: string;
  section_label: string;
  snippet_text: string;
  snippet_html: string;
}

export interface AttachableSopRule {
  key: string;
  sop_id: number;
  sop_title: string;
  source: "precondition" | "decision";
  section_id: number;
  section_label: string;
  section_category: string;
  section_narrative: string;
  /** Hierarchical rule id, e.g. "RULE-007-002". Present for decisions. */
  subrule_id?: string;
  /** Nesting level: 0 = top-level rule, 1 = sub-rule, 2 = sub-sub-rule, … */
  depth?: number;
  is_out_of_scope?: boolean;
  condition: string;
  action: string;
  decision_type: string;
  is_exception: boolean;
  is_exclusion?: boolean;
  rule_kind?: string;
  is_blocking: boolean;
  codes: string[];
  references: string[];
  goto_step: number | null;
  graph_node_key?: string;
  excluded_by?: string[];
  html_reference?: AttachableHtmlReference;
}

export interface AttachableSopSummary {
  sop_id: number;
  title: string;
  narrative: string;
  source_url?: string;
  doc_format?: string;
  rule_count?: number | null;
}

export interface AttachableTool {
  key: string;
  tool_id?: string;
  tool_kind?: "langchain" | "api_agent";
  kind?: "langchain" | "api_agent";
  name: string;
  display_name?: string;
  description?: string;
  args_schema?: Record<string, unknown>;
  invoke_url?: string;
  endpoint_id?: string;
  method?: string;
  url?: string;
  auth_type?: string;
}

// ── Persisted shape properties (saved on Shape.properties.sop_rules / .tool_calls) ──

export interface AttachedSopRule {
  key: string;
  ordering: number;
  sop_id: number;
  sop_title: string;
  source: 'precondition' | 'decision';
  section_label: string;
  section_narrative?: string;
  /** Hierarchical rule id, e.g. "RULE-000-000-001". Present for decisions. */
  subrule_id?: string;
  /** Nesting level: 0 = top-level rule, 1 = sub-rule, 2 = sub-sub-rule. */
  depth?: number;
  /**
   * Key of the parent rule this sub-rule nests under (manual sub-rules only).
   * Null/undefined for top-level rules. Drives nested execution + rendering.
   */
  parent_key?: string | null;
  /**
   * Effective out-of-scope flag for this rule: SOP-derived OR the auditor's
   * manual toggle. When true the execution engine skips this rule (no LLM call)
   * and the card shows the "Out of scope" badge.
   */
  is_out_of_scope?: boolean;
  /**
   * Auditor's manual out-of-scope toggle for THIS rule / sub-rule / sub-sub-rule.
   * Persisted (the backend derives `manual_oos_rule_keys` from it) so the choice
   * round-trips independently of the SOP-derived flag.
   */
  manual_out_of_scope?: boolean;
  /**
   * Auditor's manual "force IN scope" override for THIS rule. When true it
   * OVERRIDES a SOP-derived (or node-level) out-of-scope flag so the rule is
   * evaluated again. Persisted via `manual_in_scope_rule_keys` so it round-trips
   * and is honored by the execution engine. Mutually exclusive with
   * `manual_out_of_scope`.
   */
  manual_in_scope?: boolean;
  condition: string;
  action: string;
  decision_type: string;
  codes: string[];
  /**
   * Free-text guidance the auditor attaches to this rule on this canvas
   * node. Fed to the evaluator at runtime alongside the rule's condition;
   * empty when the rule should be evaluated "as written" with no extra
   * scoping notes / lookup tables.
   */
  additional_context?: string;
  /**
   * True for rules the auditor authored by hand on the node (no SOP source).
   * Custom rules use a `custom:<uuid>` key and are persisted in
   * `Shape.properties.sop_rules` rather than as SOP-backed bindings.
   */
  is_custom?: boolean;
}

export interface AttachedTool {
  key?: string;
  id?: string;
  tool_id?: string;
  tool_kind?: 'langchain' | 'api_agent';
  display_name?: string;
  description?: string;
  args_schema?: Record<string, unknown>;
  args_template?: Record<string, unknown>;
  rule_key?: string | null;
  rule_binding_id?: string | null;
  endpoint_id: string;
  name: string;
  method: string;
  url: string;
}

// ── RulePicker view-model types ───────────────────────────────────────────────

export interface RuleSection {
  id:         string;
  sectionKey: string;
  narrative:  string;
  rules:      AttachableSopRule[];
}

export interface SopGroup {
  sop_id:    number;
  title:     string;
  narrative: string;
  sections:  RuleSection[];
}

export interface AttachableExclusion {
  key: string;
  id?: number;
  sop_id: number;
  sop_title: string;
  source?: "llm" | "user";
  target_kind?:
    | "rule"
    | "step"
    | "section"
    | "sop"
    | "graph_node"
    | "html_block";
  target_key?: string;
  section_label: string;
  category: string;
  label: string;
  reason?: string;
  condition: string;
  action: string;
  decision_type: string;
  rule_kind: string;
  graph_node_key: string;
  overrides_rule_keys: string[];
  created_by?: string;
  created_at?: string;
  html_reference: AttachableHtmlReference;
}

export interface WorkflowAttachable {
  sops?: AttachableSopSummary[];
  sop_rules: AttachableSopRule[];
  exclusions?: AttachableExclusion[];
  tool_calls: AttachableTool[];
}

export interface RuntimeAgentInput {
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  auth_type: "none" | "bearer" | "api_key" | "basic";
  auth_token?: string;
  description?: string;
}

export type WorkflowSop = BuilderSopStatus;
export type WorkflowAgent = BuilderAttachedAgent;

// ── Public shapes ───────────────────────────────────────────────────────────

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  status: string;
  config: string | null;
  createdAt: string;
  updatedAt: string;
  sops?: WorkflowSop[];
  agents?: WorkflowAgent[];
  // Free-form server bag. Carries auto-build flags such as `needs_tools`,
  // `auto_build_canvas`, `auto_build_complete`, and `tool_prompt_shapes`.
  metadata?: Record<string, unknown>;
}

export interface NodeMeta {
  definitionSlug: string;
  workbenchId?: string;
  workAreaId?: string;
  properties?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface WorkflowDetail extends WorkflowSummary {
  nodes: string;
  edges: string;
  sops: WorkflowSop[];
  agents: WorkflowAgent[];
}

// ── Tool registry ───────────────────────────────────────────────────────────

export interface ToolRegistryEntry {
  id: string;
  name: string;
  display_name: string;
  description: string;
  kind: "langchain" | "api_agent";
  tool_kind: "langchain" | "api_agent";
  invoke_url: string;
  args_schema: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  endpoint_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ToolInvokeResponse {
  ok: boolean;
  tool: string;
  result?: unknown;
  error?: string;
}

/** One field documented by the LLM understanding of a tool response. */
export interface ToolContextField {
  name: string;
  path: string;
  type: string;
  example: unknown;
  description: string;
}

/** LLM-derived understanding of what an MCP tool returns (context store). */
export interface ToolContext {
  id: string;
  tool: string;
  tool_name: string;
  server: string | null;
  mcp_path: string;
  summary: string;
  fields: ToolContextField[];
  sample_response: unknown;
  record_count: number | null;
  truncated: boolean;
  llm_provider: string;
  llm_model: string;
  analyzed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ToolAnalyzeResponse {
  ok: boolean;
  tool: string;
  context?: ToolContext;
  error?: string;
}

export interface ToolContextResponse {
  ok: boolean;
  tool: string;
  context: ToolContext | null;
  error?: string;
}
