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

export interface AttachedTool {
  id: string;
  tool_id: string;
  name: string;
  display_name?: string;
  description?: string;
  tool_kind: "langchain" | "api_agent";
  kind?: "langchain" | "api_agent";
  invoke_url?: string;
  args_schema?: Record<string, unknown>;
  args_template?: Record<string, unknown>;
  endpoint_id?: string;
  rule_binding_id?: string | null;
  rule_key?: string | null;
  ordering?: number;
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
