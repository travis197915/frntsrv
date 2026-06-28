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

import { builderClient, toolsClient } from "./clients";
import { getToken } from "@/utils/auth";
import type {
  BuilderConnection,
  BuilderGraph,
  BuilderWorkflow,
} from "../interfaces/builder";
import type {
  BuildStatus,
  BuildStatusLog,
  NodeMeta,
  RuntimeAgentInput,
  ToolAnalyzeResponse,
  ToolContextResponse,
  ToolInvokeResponse,
  ToolRegistryEntry,
  WorkflowAttachable,
  WorkflowDetail,
  WorkflowSummary,
} from "../interfaces/workflows";

// Re-export workflow + builder types for backward compat (`@/lib/workflowsApi`).
export type {
  AttachableExclusion,
  AttachableSopRule,
  BuildStatus,
  NodeMeta,
  RuntimeAgentInput,
  ToolAnalyzeResponse,
  ToolContext,
  ToolContextField,
  ToolContextResponse,
  ToolInvokeResponse,
  ToolRegistryEntry,
  WorkflowAgent,
  WorkflowAttachable,
  WorkflowDetail,
  WorkflowSop,
  WorkflowSummary,
} from "../interfaces/workflows";

export type {
  BuilderConnection,
  BuilderGraph,
  BuilderShape,
  BuilderWorkArea,
  BuilderWorkbench,
} from "../interfaces/builder";

// ── Public types ───────────────────────────────────────────────────────────

/** One SOP column (Workbench) in a workflow, used by the reorder UI. */
export interface SopColumn {
  workbench_id: string;
  name: string;
  kind: string;
  sop_id: number | null;
  sop_title: string;
  order: number;
  shape_count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deriveStatus(wf: { is_active: boolean }): string {
  return wf.is_active ? "idle" : "inactive";
}

function toSummary(wf: BuilderWorkflow): WorkflowSummary {
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    isActive: wf.is_active,
    status: deriveStatus(wf),
    config: null,
    createdAt: wf.created_at,
    updatedAt: wf.updated_at,
    sops: wf.sops ?? [],
    agents: wf.attached_agents ?? [],
    metadata: wf.metadata ?? {},
  };
}

interface FlatNode {
  id: string;
  type: "shape";
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
          type: "shape",
          position: { x: sh.position_x, y: sh.position_y },
          style: { width: sh.width, height: sh.height },
          data: {
            definitionSlug: sh.definition_slug,
            workbenchId: wb.id,
            workAreaId: wa.id,
            label: sh.label,
            description: sh.description,
            properties: sh.properties,
            style: sh.style,
          },
        });
      }
    }
  }
  const edges: FlatEdge[] = graph.connections.map((c: BuilderConnection) => ({
    id: c.id,
    source: c.source_shape,
    target: c.target_shape,
    sourceHandle: c.source_port || undefined,
    targetHandle: c.target_port || undefined,
    label: c.label || undefined,
    data: { conditionLabel: c.condition_label || undefined },
  }));
  return { nodes, edges };
}

/** xyflow lists → Django bulk-save payload. */
function buildGraphPayload(allNodes: FlatNode[], _edges: FlatEdge[]) {
  // Filter out xyflow workarea *container* nodes — Django shapes require a
  // `definition_slug` and workareas don't have one.
  const nodes = allNodes.filter(
    (n) => (n as unknown as { type: string }).type !== "workarea",
  );

  // Preserve the per-SOP workbench structure on save.
  //
  // Each SOP is its own Workbench column; the execution engine evaluates SOPs
  // in `Workbench.order`. `flatten()` tags every persisted node with its
  // `workbenchId` / `workAreaId`, so we re-group nodes by `workbenchId` and
  // send one workbench entry per group, matched by UUID. Django matches
  // workbenches by id (not name), so this updates each column in place and no
  // longer collapses all SOPs into a single "Default" workbench (which used to
  // destroy the SOP column order — and thus the execution order — on save).
  //
  // Group iteration order follows first-encounter, which mirrors the
  // `Workbench.order` returned by GET, so the SOP column / execution order
  // survives a save.
  const savedNode = nodes.find((n) => n.data.workAreaId);
  const workAreaId = savedNode?.data.workAreaId;

  const toShape = (n: FlatNode, i: number) => ({
    ...(n.id && n.id.length === 36 ? { id: n.id } : { client_id: n.id }),
    definition_slug: n.data.definitionSlug,
    label: n.data.label || "",
    description: n.data.description || "",
    position_x: n.position.x,
    position_y: n.position.y,
    width: n.style?.width ?? undefined,
    height: n.style?.height ?? undefined,
    properties: n.data.properties ?? {},
    style: n.data.style ?? {},
    order: i,
  });

  const NEW_GROUP = "__new__";
  const groups = new Map<string, FlatNode[]>();
  for (const n of nodes) {
    const key = n.data.workbenchId || NEW_GROUP;
    const bucket = groups.get(key);
    if (bucket) bucket.push(n);
    else groups.set(key, [n]);
  }

  // Freshly-dropped nodes (no workbenchId) join the first existing column when
  // there is one; otherwise they form a single default workbench.
  const existingKeys = [...groups.keys()].filter((k) => k !== NEW_GROUP);
  if (groups.has(NEW_GROUP) && existingKeys.length > 0) {
    const target = groups.get(existingKeys[0])!;
    target.push(...groups.get(NEW_GROUP)!);
    groups.delete(NEW_GROUP);
  }

  const workbenches = [...groups.entries()].map(([key, groupNodes], wi) => {
    const isUuidKey = key !== NEW_GROUP && key.length === 36;
    return {
      ...(isUuidKey ? { id: key } : { client_id: `wb-${wi}` }),
      ...(isUuidKey ? {} : { name: "Default" }),
      order: wi,
      shapes: groupNodes.map(toShape),
    };
  });

  const work_areas = [
    {
      ...(workAreaId ? { id: workAreaId } : { client_id: "wa-default-0", name: "Canvas" }),
      order: 0,
      workbenches,
    },
  ];

  // Build connections from the edges array.
  // Django resolves each endpoint by UUID (source_shape_id) when the node was
  // already persisted, or by client_id (source_client_id) for nodes that were
  // just created in this same payload.  A 36-char string is treated as a UUID.
  const isUuid = (s: string) => s.length === 36;

  const connections = _edges
    .filter((e) => e.source && e.target && e.source !== e.target)
    .map((e) => ({
      ...(e.id && isUuid(e.id) ? { id: e.id } : {}),
      ...(isUuid(e.source)
        ? { source_shape_id: e.source }
        : { source_client_id: e.source }),
      ...(isUuid(e.target)
        ? { target_shape_id: e.target }
        : { target_client_id: e.target }),
      ...(e.sourceHandle ? { source_port: e.sourceHandle } : {}),
      ...(e.targetHandle ? { target_port: e.targetHandle } : {}),
      ...(e.label ? { label: e.label } : {}),
      ...(e.data?.conditionLabel
        ? { condition_label: e.data.conditionLabel }
        : {}),
    }));

  return { work_areas, connections };
}

function toDetail(graph: BuilderGraph): WorkflowDetail {
  const { nodes, edges } = flatten(graph);
  const summary = toSummary(graph);
  return {
    ...summary,
    nodes: JSON.stringify(nodes),
    edges: JSON.stringify(edges),
    sops: summary.sops ?? [],
    agents: summary.agents ?? [],
  };
}

// ── Build log stream (SSE over fetch — keeps the JWT header) ────────────────

export interface BuildStreamHandlers {
  onLog?: (log: BuildStatusLog) => void;
  onLlmError?: (err: { error: string }) => void;
  onDone?: (data: {
    stats: { sops: number; shapes: number; rules: number } | null;
    needs_tools: boolean;
  }) => void;
  onFailed?: (data: { detail: string }) => void;
}

const BUILDER_BASE = `${(
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"
).replace(/\/+$/, "")}/api/builder`;

/**
 * Tail the SOP→workflow build via Server-Sent Events. Returns a promise that
 * resolves when the stream ends (done/failed/aborted). The native EventSource
 * API can't send Authorization headers, so we parse SSE off a fetch stream.
 */
export async function streamBuildLogs(
  id: string,
  handlers: BuildStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BUILDER_BASE}/workflows/${id}/build_stream/`, {
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`build stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, sep);
      buf = buf.slice(sep + 2);

      let event = "message";
      let data = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith(":")) continue; // heartbeat / comment
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      let payload: unknown;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }

      switch (event) {
        case "log":
          handlers.onLog?.(payload as BuildStatusLog);
          break;
        case "llm_error":
          handlers.onLlmError?.(payload as { error: string });
          break;
        case "done":
          handlers.onDone?.(
            payload as {
              stats: { sops: number; shapes: number; rules: number } | null;
              needs_tools: boolean;
            },
          );
          return;
        case "failed":
          handlers.onFailed?.(payload as { detail: string });
          return;
        default:
          break;
      }
    }
  }
}

// ── Public surface ─────────────────────────────────────────────────────────

export const workflowsApi = {
  async list(): Promise<WorkflowSummary[]> {
    const items = await builderClient.get<BuilderWorkflow[]>("/workflows/");
    return items.map(toSummary);
  },

  async get(id: string): Promise<WorkflowDetail> {
    const graph = await builderClient.get<BuilderGraph>(
      `/workflows/${id}/graph/`,
    );
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
    // Opt-in add-on: when true, the backend auto-builds the canvas (shapes +
    // rule bindings) from the ingested SOP(s) once ingestion completes, leaving
    // tool calls empty for the user to attach.
    autoBuildFromSop?: boolean;
  }): Promise<WorkflowDetail> {
    const wf = await builderClient.post<BuilderWorkflow>("/workflows/", {
      name: input.name,
      description: input.description ?? "",
      is_active: input.isActive ?? true,
      sop_urls: input.sopUrls ?? [],
      runtime_agents: input.runtimeAgents ?? [],
      auto_build_from_sop: input.autoBuildFromSop ?? false,
    });
    if (input.nodes || input.edges) {
      const nodes = input.nodes
        ? (JSON.parse(input.nodes) as FlatNode[])
        : [];
      const edges = input.edges
        ? (JSON.parse(input.edges) as FlatEdge[])
        : [];
      const graph = await builderClient.put<BuilderGraph>(
        `/workflows/${wf.id}/graph/`,
        buildGraphPayload(nodes, edges),
      );
      return toDetail(graph);
    }
    const graph = await builderClient.get<BuilderGraph>(
      `/workflows/${wf.id}/graph/`,
    );
    return toDetail(graph);
  },

  async buildStatus(id: string): Promise<BuildStatus> {
    return builderClient.get<BuildStatus>(`/workflows/${id}/build_status/`);
  },

  async getAttachable(id: string): Promise<WorkflowAttachable> {
    return builderClient.get<WorkflowAttachable>(
      `/workflows/${id}/attachable/`,
    );
  },

  async getAttachableSopRules(
    id: string,
    sopId: number,
  ): Promise<WorkflowAttachable> {
    return builderClient.get<WorkflowAttachable>(
      `/workflows/${id}/attachable/?sop_id=${sopId}`,
    );
  },

  async attach(
    id: string,
    input: {
      sopUrls?: string[];
      runtimeAgents?: RuntimeAgentInput[];
      // When true the canvas is rebuilt from ALL of the workflow's SOPs once
      // ingestion completes (one workbench column per SOP — N SOPs supported).
      autoBuildFromSop?: boolean;
    },
  ): Promise<WorkflowDetail> {
    await builderClient.post(`/workflows/${id}/attach/`, {
      sop_urls: input.sopUrls ?? [],
      runtime_agents: input.runtimeAgents ?? [],
      auto_build_from_sop: input.autoBuildFromSop ?? false,
    });
    const graph = await builderClient.get<BuilderGraph>(
      `/workflows/${id}/graph/`,
    );
    return toDetail(graph);
  },

  /**
   * Upload a local SOP document (PDF/DOCX/XLSX/HTML). Returns a ``file://``
   * seed URL that can be passed inside ``sopUrls`` to create()/attach() —
   * the file is then ingested + auto-built exactly like an HTML link.
   */
  async uploadSopDocument(
    file: File,
  ): Promise<{ url: string; name: string; size: number }> {
    const form = new FormData();
    form.append("file", file);
    return builderClient.post<{ url: string; name: string; size: number }>(
      "/workflows/sop_upload/",
      form,
    );
  },

  async update(
    id: string,
    input: {
      name?: string;
      description?: string;
      isActive?: boolean;
      nodes?: string;
      edges?: string;
    },
  ): Promise<WorkflowDetail> {
    if (
      input.name !== undefined ||
      input.description !== undefined ||
      input.isActive !== undefined
    ) {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined)
        patch.description = input.description;
      if (input.isActive !== undefined) patch.is_active = input.isActive;
      await builderClient.patch<BuilderWorkflow>(`/workflows/${id}/`, patch);
    }
    if (input.nodes !== undefined || input.edges !== undefined) {
      const nodes = input.nodes
        ? (JSON.parse(input.nodes) as FlatNode[])
        : [];
      const edges = input.edges
        ? (JSON.parse(input.edges) as FlatEdge[])
        : [];
      await builderClient.put<BuilderGraph>(
        `/workflows/${id}/graph/`,
        buildGraphPayload(nodes, edges),
      );
    }
    const graph = await builderClient.get<BuilderGraph>(
      `/workflows/${id}/graph/`,
    );
    return toDetail(graph);
  },

  /** Ordered SOP columns (workbenches) of a workflow. */
  async sopColumns(id: string): Promise<SopColumn[]> {
    return builderClient.get<SopColumn[]>(`/workflows/${id}/sop-order/`);
  },

  /**
   * Reorder the SOP columns. `order` is the workbench-id sequence in the new
   * left-to-right / execution order. Returns the resulting columns.
   */
  async reorderSops(id: string, order: string[]): Promise<SopColumn[]> {
    return builderClient.put<SopColumn[]>(`/workflows/${id}/sop-order/`, {
      order,
    });
  },

  async remove(id: string): Promise<void> {
    await builderClient.delete(`/workflows/${id}/`);
  },

  async duplicate(id: string, name?: string): Promise<WorkflowDetail> {
    const wf = await builderClient.post<BuilderWorkflow>(
      `/workflows/${id}/duplicate/`,
      name ? { name } : {},
    );
    const graph = await builderClient.get<BuilderGraph>(
      `/workflows/${wf.id}/graph/`,
    );
    return toDetail(graph);
  },

  async activate(id: string): Promise<WorkflowSummary> {
    const wf = await builderClient.post<BuilderWorkflow>(
      `/workflows/${id}/activate/`,
      {},
    );
    return toSummary(wf);
  },

  async deactivate(id: string): Promise<WorkflowSummary> {
    const wf = await builderClient.post<BuilderWorkflow>(
      `/workflows/${id}/deactivate/`,
      {},
    );
    return toSummary(wf);
  },
};

// ── Tool registry API ──────────────────────────────────────────────────────

export const toolRegistryApi = {
  async list(): Promise<ToolRegistryEntry[]> {
    return toolsClient.get<ToolRegistryEntry[]>("/");
  },

  async detail(name: string): Promise<ToolRegistryEntry> {
    return toolsClient.get<ToolRegistryEntry>(
      `/${encodeURIComponent(name)}/`,
    );
  },

  async invoke(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolInvokeResponse> {
    return toolsClient.post<ToolInvokeResponse>(
      `/${encodeURIComponent(name)}/invoke`,
      { args },
    );
  },

  /** Cached LLM understanding of the tool's response (null when never run). */
  async context(name: string): Promise<ToolContextResponse> {
    return toolsClient.get<ToolContextResponse>(
      `/${encodeURIComponent(name)}/context`,
    );
  },

  /**
   * Send a response payload (or args to fetch one) to the LLM, derive a
   * field-level understanding, and persist it to the context store.
   */
  async analyze(
    name: string,
    body: { result?: unknown; args?: Record<string, unknown> },
  ): Promise<ToolAnalyzeResponse> {
    return toolsClient.post<ToolAnalyzeResponse>(
      `/${encodeURIComponent(name)}/analyze`,
      body,
    );
  },
};
