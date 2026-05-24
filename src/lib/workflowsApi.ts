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
import type {
  BuilderConnection,
  BuilderGraph,
  BuilderWorkflow,
} from "../interfaces/builder";
import type {
  NodeMeta,
  RuntimeAgentInput,
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
  NodeMeta,
  RuntimeAgentInput,
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
function buildGraphPayload(nodes: FlatNode[], _edges: FlatEdge[]) {
  const FALLBACK_WA = "Canvas";
  const FALLBACK_WB = "Default";
  const groups = new Map<
    string,
    {
      workAreaId?: string;
      workAreaName: string;
      workbenchId?: string;
      workbenchName: string;
      shapes: FlatNode[];
    }
  >();

  for (const node of nodes) {
    const waKey = node.data.workAreaId ?? FALLBACK_WA;
    const wbKey = node.data.workbenchId ?? FALLBACK_WB;
    const key = `${waKey}::${wbKey}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        workAreaId: node.data.workAreaId,
        workAreaName: node.data.workAreaId ? FALLBACK_WA : FALLBACK_WA,
        workbenchId: node.data.workbenchId,
        workbenchName: node.data.workbenchId ? FALLBACK_WB : FALLBACK_WB,
        shapes: [],
      };
      groups.set(key, group);
    }
    group.shapes.push(node);
  }

  const wbClientIdOf = (wbId: string | undefined) =>
    wbId ? undefined : "wb-default";

  const work_areas = Array.from(groups.values()).map((g, waIdx) => ({
    ...(g.workAreaId
      ? { id: g.workAreaId }
      : { client_id: `wa-default-${waIdx}` }),
    name: g.workAreaName,
    order: waIdx,
    workbenches: [
      {
        ...(g.workbenchId
          ? { id: g.workbenchId }
          : { client_id: wbClientIdOf(g.workbenchId) }),
        name: g.workbenchName,
        order: 0,
        shapes: g.shapes.map((n, i) => ({
          ...(n.id && n.id.length === 36
            ? { id: n.id }
            : { client_id: n.id }),
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
        })),
      },
    ],
  }));

  return { work_areas, connections: [] as never[] };
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
  }): Promise<WorkflowDetail> {
    const wf = await builderClient.post<BuilderWorkflow>("/workflows/", {
      name: input.name,
      description: input.description ?? "",
      is_active: input.isActive ?? true,
      sop_urls: input.sopUrls ?? [],
      runtime_agents: input.runtimeAgents ?? [],
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

  async getAttachable(id: string): Promise<WorkflowAttachable> {
    return builderClient.get<WorkflowAttachable>(
      `/workflows/${id}/attachable/`,
    );
  },

  async attach(
    id: string,
    input: { sopUrls?: string[]; runtimeAgents?: RuntimeAgentInput[] },
  ): Promise<WorkflowDetail> {
    await builderClient.post(`/workflows/${id}/attach/`, {
      sop_urls: input.sopUrls ?? [],
      runtime_agents: input.runtimeAgents ?? [],
    });
    const graph = await builderClient.get<BuilderGraph>(
      `/workflows/${id}/graph/`,
    );
    return toDetail(graph);
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
};
