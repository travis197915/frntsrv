/**
 * Workflows adapter — bridges the Django **builder** REST surface to the
 * legacy xyflow-friendly shape the SPA was written against.
 *
 *   Django graph                      ←→  xyflow / SPA shape
 *   work_areas / workbenches / shapes ←→  flat `nodes` array
 *   connections                       ←→  flat `edges` array
 *
 * Every shape carries its **catalog slug** in `data.definitionSlug` — the
 * canvas renderer uses that to pull the SVG / property schema straight out
 * of `/catalog/shapes/`, so nothing about the look of a node is hardcoded.
 */

import {
  api,
  toolsApi,
  type BuilderAttachedAgent,
  type BuilderConnection,
  type BuilderGraph,
  type BuilderShape,
  type BuilderSopStatus,
  type BuilderWorkArea,
  type BuilderWorkbench,
  type BuilderWorkflow,
} from './api';

// ── Workflow attachments (SOPs + runtime API agents) ──────────────────────────

// ── Attachable rules + tools (per workflow, for per-node attachments) ──────

/** Source-of-truth reference block for a rule/exclusion — lets the SPA
 *  render the original document context (HTML iframe / text panel). */
export interface AttachableHtmlReference {
  source_url:    string;
  doc_format:    string;            // "HTML" | "DOCX" | "PDF" | "XLSX" | …
  anchor:        string;
  section_label: string;
  snippet_text:  string;
  snippet_html:  string;
}

export interface AttachableSopRule {
  key: string;             // e.g. "pre:22:1:0" / "step:22:0:3"
  sop_id: number;
  sop_title: string;
  source: 'precondition' | 'decision';
  section_id: number;
  section_label: string;
  section_category: string;
  /** LLM-generated narrative for the parent section (step or pre-condition). */
  section_narrative: string;
  condition: string;
  action: string;
  decision_type: string;
  is_exception: boolean;
  /** True when this rule is itself an exclusion (LLM-flagged or user-marked). */
  is_exclusion?: boolean;
  /** "rule" | "decision" | "exclusion" | "exception". */
  rule_kind?: string;
  is_blocking: boolean;
  codes: string[];
  /** Keys of rules this rule depends on (e.g. all sibling rows of a `goto_step`). */
  references: string[];
  /** Target step number if this row jumps to another step. */
  goto_step: number | null;
  /** Stable knowledge-graph node id (e.g. "step_4_d0", "pre_3_r5"). */
  graph_node_key?: string;
  /** Keys of exclusions (LLM or user) that override this rule. */
  excluded_by?: string[];
  /** Source-of-truth reference block (original document context). */
  html_reference?: AttachableHtmlReference;
}

export interface AttachableSopSummary {
  sop_id: number;
  title: string;
  narrative: string;
  source_url?: string;
  doc_format?: string;
}

/**
 * One tool surfaced by `/api/builder/workflows/:id/attachable/` and
 * `/api/agent-tools/`.  The same envelope is used in three places in the
 * SPA:
 *   • left palette "Tools" section
 *   • RulePicker right-rail registry
 *   • ConfigPanel grouped list under each rule
 */
export interface AttachableTool {
  key: string;                 // "tool:<name>" (langchain) or "agent:<endpoint>" (api_agent)
  /** UUID of the agent_tools.Tool row. */
  tool_id?: string;
  /** Distinguishes LangChain tools from registered runtime API agents. */
  tool_kind?: 'langchain' | 'api_agent';
  /** Alias of tool_kind kept for legacy `tool_calls` consumers. */
  kind?: 'langchain' | 'api_agent';
  /** Stable slug (also the LangChain tool name). */
  name: string;
  /** Human-friendly label (falls back to `name`). */
  display_name?: string;
  description?: string;
  /** Pydantic JSON-Schema for the tool's input model. */
  args_schema?: Record<string, unknown>;
  /** API endpoint to POST args to (for langchain: /api/agent-tools/{name}/invoke). */
  invoke_url?: string;
  /** Legacy api_agent fields. */
  endpoint_id?: string;
  method?: string;
  url?: string;
  auth_type?: string;
}

/** One tool already attached to a canvas node (read from the binding tables). */
export interface AttachedTool {
  /** UUID of the NodeToolBinding row. */
  id: string;
  /** UUID of the referenced agent_tools.Tool row. */
  tool_id: string;
  name: string;
  display_name?: string;
  description?: string;
  tool_kind: 'langchain' | 'api_agent';
  /** Alias kept for legacy code paths. */
  kind?: 'langchain' | 'api_agent';
  invoke_url?: string;
  args_schema?: Record<string, unknown>;
  args_template?: Record<string, unknown>;
  endpoint_id?: string;
  /** Set when this tool was picked while attaching a specific rule. */
  rule_binding_id?: string | null;
  /** Convenience: the rule_key of the rule it was picked alongside. */
  rule_key?: string | null;
  ordering?: number;
}

export interface AttachableExclusion {
  key: string;                      // "pre:22:88:0" (LLM) or "user-excl:42" (user)
  /** Backend row id when source === "user". */
  id?: number;
  sop_id: number;
  sop_title: string;
  /** "llm" (derived from is_exception / OVERRIDES edge) or "user" (auditor-picked). */
  source?: 'llm' | 'user';
  /** Only for user exclusions — kind & key of the excluded target. */
  target_kind?: 'rule' | 'step' | 'section' | 'sop' | 'graph_node' | 'html_block';
  target_key?:  string;
  section_label: string;
  category: string;
  label: string;
  reason?: string;
  condition: string;
  action: string;
  decision_type: string;
  rule_kind: string;
  graph_node_key: string;
  /** Rule keys this exclusion neutralises (fan-out resolved by backend). */
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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  auth_type: 'none' | 'bearer' | 'api_key' | 'basic';
  auth_token?: string;
  description?: string;
}

export type WorkflowSop   = BuilderSopStatus;
export type WorkflowAgent = BuilderAttachedAgent;

// ── Public shapes (kept as close to the old GraphQL types as possible) ─────

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

/** Sentinel saved on every xyflow node so we can round-trip Django state. */
export interface NodeMeta {
  /** Shape catalog slug (`rect`, `diamond`, `cloud`, …). */
  definitionSlug: string;
  /** UUID of the parent workbench in Django. */
  workbenchId?: string;
  /** UUID of the parent work-area in Django. */
  workAreaId?: string;
  /** Free-form property values matching the shape's `property_schema`. */
  properties?: Record<string, unknown>;
  /** Per-instance style overrides. */
  style?: Record<string, unknown>;
}

export interface WorkflowDetail extends WorkflowSummary {
  /** xyflow nodes (JSON-encoded — kept as a string for backwards compat). */
  nodes: string;
  /** xyflow edges (JSON-encoded). */
  edges: string;
  sops: WorkflowSop[];
  agents: WorkflowAgent[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deriveStatus(wf: { is_active: boolean }): string {
  return wf.is_active ? 'idle' : 'inactive';
}

function toSummary(wf: BuilderWorkflow): WorkflowSummary {
  return {
    id:          wf.id,
    name:        wf.name,
    description: wf.description,
    isActive:    wf.is_active,
    status:      deriveStatus(wf),
    config:      null,
    createdAt:   wf.created_at,
    updatedAt:   wf.updated_at,
    sops:        wf.sops ?? [],
    agents:      wf.attached_agents ?? [],
  };
}

interface FlatNode {
  id: string;
  type: 'shape';
  position: { x: number; y: number };
  data: NodeMeta & { label: string; description?: string };
  style?: { width?: number; height?: number };
}

interface FlatEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: { conditionLabel?: string };
}

/** Django graph → flat xyflow lists. */
function flatten(graph: BuilderGraph): { nodes: FlatNode[]; edges: FlatEdge[] } {
  const nodes: FlatNode[] = [];
  for (const wa of graph.work_areas) {
    for (const wb of wa.workbenches) {
      for (const sh of wb.shapes) {
        nodes.push({
          id: sh.id,
          type: 'shape',
          position: { x: sh.position_x, y: sh.position_y },
          style: { width: sh.width, height: sh.height },
          data: {
            definitionSlug: sh.definition_slug,
            workbenchId:    wb.id,
            workAreaId:     wa.id,
            label:          sh.label,
            description:    sh.description,
            properties:     sh.properties,
            style:          sh.style,
          },
        });
      }
    }
  }
  const edges: FlatEdge[] = graph.connections.map((c) => ({
    id:           c.id,
    source:       c.source_shape,
    target:       c.target_shape,
    sourceHandle: c.source_port || undefined,
    targetHandle: c.target_port || undefined,
    label:        c.label || undefined,
    data:         { conditionLabel: c.condition_label || undefined },
  }));
  return { nodes, edges };
}

/** xyflow lists → Django bulk-save payload.
 *
 * Edges are intentionally ignored — they're a frontend-only concern
 * (stored in localStorage by `useWorkflowCanvas`).  We still accept the
 * argument so callers don't have to change, but the payload always
 * sends `connections: []` so Django wipes any stale rows. */
function buildGraphPayload(nodes: FlatNode[], _edges: FlatEdge[]) {
  // Group nodes by (workAreaId, workbenchId).  Anything missing a parent
  // falls into a default work-area / workbench so the canvas always
  // round-trips even if the user dropped a shape onto an empty surface.
  const FALLBACK_WA = 'Canvas';
  const FALLBACK_WB = 'Default';
  const groups = new Map<string, {
    workAreaId?: string;
    workAreaName: string;
    workbenchId?: string;
    workbenchName: string;
    shapes: FlatNode[];
  }>();

  for (const node of nodes) {
    const waKey = node.data.workAreaId ?? FALLBACK_WA;
    const wbKey = node.data.workbenchId ?? FALLBACK_WB;
    const key = `${waKey}::${wbKey}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        workAreaId:    node.data.workAreaId,
        workAreaName:  node.data.workAreaId ? FALLBACK_WA : FALLBACK_WA,
        workbenchId:   node.data.workbenchId,
        workbenchName: node.data.workbenchId ? FALLBACK_WB : FALLBACK_WB,
        shapes: [],
      };
      groups.set(key, group);
    }
    group.shapes.push(node);
  }

  const wbClientIdOf = (wbId: string | undefined) =>
    wbId ? undefined : 'wb-default';

  const work_areas = Array.from(groups.values()).map((g, waIdx) => ({
    ...(g.workAreaId ? { id: g.workAreaId } : { client_id: `wa-default-${waIdx}` }),
    name: g.workAreaName,
    order: waIdx,
    workbenches: [{
      ...(g.workbenchId ? { id: g.workbenchId } : { client_id: wbClientIdOf(g.workbenchId) }),
      name: g.workbenchName,
      order: 0,
      shapes: g.shapes.map((n, i) => ({
        ...(n.id && n.id.length === 36 ? { id: n.id } : { client_id: n.id }),
        definition_slug: n.data.definitionSlug,
        label:           n.data.label || '',
        description:     n.data.description || '',
        position_x:      n.position.x,
        position_y:      n.position.y,
        width:           n.style?.width  ?? undefined,
        height:          n.style?.height ?? undefined,
        properties:      n.data.properties ?? {},
        style:           n.data.style ?? {},
        order:           i,
      })),
    }],
  }));

  return { work_areas, connections: [] as never[] };
}

function toDetail(graph: BuilderGraph): WorkflowDetail {
  const { nodes, edges } = flatten(graph);
  const summary = toSummary(graph);
  return {
    ...summary,
    nodes:  JSON.stringify(nodes),
    edges:  JSON.stringify(edges),
    sops:   summary.sops ?? [],
    agents: summary.agents ?? [],
  };
}

// ── Public surface ─────────────────────────────────────────────────────────

export const workflowsApi = {
  async list(): Promise<WorkflowSummary[]> {
    const items = await api.get<BuilderWorkflow[]>('/workflows/');
    return items.map(toSummary);
  },

  async get(id: string): Promise<WorkflowDetail> {
    const graph = await api.get<BuilderGraph>(`/workflows/${id}/graph/`);
    return toDetail(graph);
  },

  async create(input: {
    name: string;
    description?: string;
    isActive?: boolean;
    nodes?: string;
    edges?: string;
    sopUrls?: string[];
    runtimeAgents?: RuntimeAgentInput[];
  }): Promise<WorkflowDetail> {
    const wf = await api.post<BuilderWorkflow>('/workflows/', {
      name:           input.name,
      description:    input.description ?? '',
      is_active:      input.isActive ?? true,
      sop_urls:       input.sopUrls ?? [],
      runtime_agents: input.runtimeAgents ?? [],
    });
    if (input.nodes || input.edges) {
      const nodes = input.nodes ? (JSON.parse(input.nodes) as FlatNode[]) : [];
      const edges = input.edges ? (JSON.parse(input.edges) as FlatEdge[]) : [];
      const graph = await api.put<BuilderGraph>(
        `/workflows/${wf.id}/graph/`,
        buildGraphPayload(nodes, edges),
      );
      return toDetail(graph);
    }
    const graph = await api.get<BuilderGraph>(`/workflows/${wf.id}/graph/`);
    return toDetail(graph);
  },

  async getAttachable(id: string): Promise<WorkflowAttachable> {
    return api.get<WorkflowAttachable>(`/workflows/${id}/attachable/`);
  },

  async attach(
    id: string,
    input: { sopUrls?: string[]; runtimeAgents?: RuntimeAgentInput[] },
  ): Promise<WorkflowDetail> {
    await api.post(`/workflows/${id}/attach/`, {
      sop_urls:       input.sopUrls ?? [],
      runtime_agents: input.runtimeAgents ?? [],
    });
    const graph = await api.get<BuilderGraph>(`/workflows/${id}/graph/`);
    return toDetail(graph);
  },

  async update(
    id: string,
    input: {
      name?:        string;
      description?: string;
      isActive?:    boolean;
      nodes?:       string;
      edges?:       string;
    },
  ): Promise<WorkflowDetail> {
    if (input.name !== undefined || input.description !== undefined || input.isActive !== undefined) {
      const patch: Record<string, unknown> = {};
      if (input.name        !== undefined) patch.name        = input.name;
      if (input.description !== undefined) patch.description = input.description;
      if (input.isActive    !== undefined) patch.is_active   = input.isActive;
      await api.patch<BuilderWorkflow>(`/workflows/${id}/`, patch);
    }
    if (input.nodes !== undefined || input.edges !== undefined) {
      const nodes = input.nodes ? (JSON.parse(input.nodes) as FlatNode[]) : [];
      const edges = input.edges ? (JSON.parse(input.edges) as FlatEdge[]) : [];
      await api.put<BuilderGraph>(
        `/workflows/${id}/graph/`,
        buildGraphPayload(nodes, edges),
      );
    }
    const graph = await api.get<BuilderGraph>(`/workflows/${id}/graph/`);
    return toDetail(graph);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/workflows/${id}/`);
  },

  async duplicate(id: string, name?: string): Promise<WorkflowDetail> {
    const wf = await api.post<BuilderWorkflow>(
      `/workflows/${id}/duplicate/`,
      name ? { name } : {},
    );
    const graph = await api.get<BuilderGraph>(`/workflows/${wf.id}/graph/`);
    return toDetail(graph);
  },

  async activate(id: string): Promise<WorkflowSummary> {
    const wf = await api.post<BuilderWorkflow>(`/workflows/${id}/activate/`, {});
    return toSummary(wf);
  },

  async deactivate(id: string): Promise<WorkflowSummary> {
    const wf = await api.post<BuilderWorkflow>(`/workflows/${id}/deactivate/`, {});
    return toSummary(wf);
  },
};

// ── Tool registry API ──────────────────────────────────────────────────────

export interface ToolRegistryEntry {
  id: string;
  name: string;
  display_name: string;
  description: string;
  kind: 'langchain' | 'api_agent';
  tool_kind: 'langchain' | 'api_agent';
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

export const toolRegistryApi = {
  async list(): Promise<ToolRegistryEntry[]> {
    return toolsApi.get<ToolRegistryEntry[]>('/');
  },

  async detail(name: string): Promise<ToolRegistryEntry> {
    return toolsApi.get<ToolRegistryEntry>(`/${encodeURIComponent(name)}/`);
  },

  async invoke(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolInvokeResponse> {
    return toolsApi.post<ToolInvokeResponse>(
      `/${encodeURIComponent(name)}/invoke`,
      { args },
    );
  },
};

// Re-export the raw Django types so canvas code can typecheck against them.
export type {
  BuilderGraph,
  BuilderShape,
  BuilderWorkArea,
  BuilderWorkbench,
  BuilderConnection,
};
