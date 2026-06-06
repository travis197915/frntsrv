import type { BuilderAttachedAgent, BuilderSopStatus } from "./builder";

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
  /** True when the rule (or its enclosing section) is flagged out of scope. */
  is_out_of_scope?: boolean;
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
