import { useCallback, useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  MarkerType,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  WorkflowNodeType,
  WorkflowCanvasJSON,
  WorkflowMeta,
} from '../types';
import type { ShapeDefinition } from '@/lib/api';

let idCounter = 0;
const nextId = () => `node_${Date.now()}_${++idCounter}`;

// Edges are a frontend-only concern — we keep them in localStorage keyed by
// workflow id so they survive reloads, but Django never sees them.  Nodes
// (shapes) still come from the Django catalog / workflow API.
const EDGE_STORAGE_PREFIX = 'workflow:edges:v1:';
const edgeStorageKey = (id: string | undefined) =>
  id ? `${EDGE_STORAGE_PREFIX}${id}` : null;

function readLocalEdges(id: string | undefined): unknown[] {
  const key = edgeStorageKey(id);
  if (!key || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEdges(id: string | undefined, edges: unknown[]): void {
  const key = edgeStorageKey(id);
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(edges));
  } catch {
    /* quota / privacy mode — silently ignore */
  }
}

function edgeMarkerColor(): string {
  if (typeof document === 'undefined') return '#71717a';
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim() ||
    '#71717a'
  );
}

const DEFAULT_META: WorkflowMeta = {
  id: '',
  name: 'Untitled Workflow',
  description: '',
  status: 'idle',
};

export interface WorkflowCanvasSaveResult {
  id?: string;
}

export interface WorkflowCanvasOptions {
  onSave?: (payload: {
    id: string | undefined;
    name: string;
    description: string;
    nodesJson: string;
    edgesJson: string;
  }) => Promise<WorkflowCanvasSaveResult | void>;
  /**
   * Lookup table provided by `ShapeCatalogProvider`.  When the palette
   * drag payload is `shape:<slug>`, we read width / height / default
   * label from this map so the dropped node renders the same way the
   * palette previewed it.
   */
  shapeCatalog?: Record<string, ShapeDefinition>;
}

/** Drag payload prefix used by the catalog-driven `NodePalette`. */
const SHAPE_DRAG_PREFIX = 'shape:';

export type RFEdgeType = 'default' | 'straight' | 'step' | 'smoothstep';

export function useWorkflowCanvas(
  workflowId: string | undefined,
  options: WorkflowCanvasOptions = {},
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>({ ...DEFAULT_META, id: workflowId ?? '' });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const defaultEdgeType: RFEdgeType = 'smoothstep';
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const { getNodes } = useReactFlow();
  const { onSave, shapeCatalog } = options;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const loadFromJSON = useCallback((config: string | null | undefined, meta?: Partial<WorkflowMeta>) => {
    if (meta) {
      setWorkflowMeta((prev) => ({ ...prev, ...meta }));
    }

    if (!config) return;

    try {
      const canvas: WorkflowCanvasJSON = JSON.parse(config);
      if (canvas.version !== 1) return;

      const loadedNodes: WorkflowNode[] = canvas.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        ...(n.parentId ? { parentId: n.parentId, extent: 'parent' as const } : {}),
        ...(n.style ? { style: n.style } : {}),
      }));

      const markerColor = edgeMarkerColor();

      // Edges are a frontend-only concern — read from localStorage instead
      // of the workflow JSON.  Nodes come from Django, edges come from the
      // user's browser.
      const wfId = (meta?.id) ?? workflowMeta.id;
      const stored = readLocalEdges(wfId) as Partial<WorkflowEdge>[];
      const loadedEdges: WorkflowEdge[] = stored.map((e) => ({
        id:           e.id ?? `edge_${Math.random().toString(36).slice(2)}`,
        source:       e.source ?? '',
        target:       e.target ?? '',
        ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
        type:         'smoothstep',
        markerEnd:    { type: MarkerType.ArrowClosed, color: markerColor },
        ...(e.label  ? { label: e.label } : {}),
        ...(e.data   ? { data:  e.data  } : {}),
      })).filter((e) => e.source && e.target);

      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setIsDirty(false);
    } catch {
      // invalid config, start blank
    }
  }, [setNodes, setEdges]);

  // Load: workflow from GraphQL API; empty canvas + placeholder meta if loading
  useEffect(() => {
    if (!workflowId) {
      setWorkflowMeta((m) => ({ ...DEFAULT_META, id: m.id || '' }));
      return;
    }

    // Live mode: no workflow API wired yet — start blank until GET_WORKFLOW is added.
    setNodes([]);
    setEdges([]);
    setWorkflowMeta((m) => ({
      ...DEFAULT_META,
      id: workflowId,
      name: m.name && m.id === workflowId ? m.name : 'Untitled Workflow',
    }));
    setIsDirty(false);
  }, [workflowId, loadFromJSON, setNodes, setEdges]);

  useLayoutEffect(() => {
    const c = edgeMarkerColor();
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: c },
      })),
    );
  }, [setEdges]);

  // Persist edges to localStorage whenever they change.  Strip transient
  // render-only fields (`markerEnd` colour, execution-status data) so we
  // only store the user's intent.
  useEffect(() => {
    if (!workflowMeta.id) return;
    const snapshot = edges.map((e) => ({
      id:           e.id,
      source:       e.source,
      target:       e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label:        typeof e.label === 'string' ? e.label : undefined,
      data:         e.data,
    }));
    writeLocalEdges(workflowMeta.id, snapshot);
  }, [edges, workflowMeta.id]);

  const serializeCanvas = useCallback((): string => {
    const viewport = rfInstance.current?.getViewport();
    const canvas: WorkflowCanvasJSON = {
      version: 1,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.type as WorkflowNodeType) ?? 'shape',
        position: n.position,
        data: n.data as WorkflowNodeData,
        ...(n.parentId ? { parentId: n.parentId, extent: 'parent' as const } : {}),
        ...(n.style && (n.style.width !== undefined || n.style.height !== undefined)
          ? {
              style: {
                width: typeof n.style.width === 'number' ? n.style.width : undefined,
                height: typeof n.style.height === 'number' ? n.style.height : undefined,
              },
            }
          : {}),
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        data: e.data as any,
      })),
      viewport: viewport ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom } : undefined,
    };
    return JSON.stringify(canvas);
  }, [nodes, edges]);

  const saveWorkflow = useCallback(async () => {
    if (!onSave) {
      setIsDirty(false);
      return;
    }

    setIsSaving(true);
    try {
      const serialized = serializeCanvas();
      const canvas = JSON.parse(serialized) as WorkflowCanvasJSON;
      const nodesJson = JSON.stringify(canvas.nodes);
      const edgesJson  = JSON.stringify(canvas.edges);

      const result = await onSave({
        id:          workflowMeta.id || undefined,
        name:        workflowMeta.name,
        description: workflowMeta.description ?? '',
        nodesJson,
        edgesJson,
      });

      if (result?.id && result.id !== workflowMeta.id) {
        setWorkflowMeta((m) => ({ ...m, id: result.id! }));
      }
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [serializeCanvas, workflowMeta.id, workflowMeta.name, workflowMeta.description, onSave, setWorkflowMeta]);

  const onConnect = useCallback(
    (params: Connection) => {
      const currentNodes = getNodes();
      const sourceNode = currentNodes.find((n) => n.id === params.source);
      const targetNode = currentNodes.find((n) => n.id === params.target);

      if (sourceNode?.type === 'workarea' || targetNode?.type === 'workarea') {
        return;
      }

      const edgeId = `edge_${Date.now()}_${++idCounter}`;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: edgeId,
            type: defaultEdgeType,
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeMarkerColor() },
          },
          eds,
        ),
      );
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
      setIsDirty(true);
    },
    [setEdges, getNodes],
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: WorkflowEdge) => {
      setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
      setSelectedNodeId(null);
    },
    [],
  );

  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  const labelEdge = useCallback(
    (id: string, label: string) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, label: label || undefined } : e)),
      );
      setIsDirty(true);
    },
    [setEdges],
  );

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData('application/reactflow');
      if (!payload) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // ── Catalog-driven shape drop (`shape:<slug>`) ──────────────────────
      if (payload.startsWith(SHAPE_DRAG_PREFIX)) {
        const slug = payload.slice(SHAPE_DRAG_PREFIX.length);
        const def = shapeCatalog?.[slug];
        if (!def) return;

        // The Django writer materialises a synthetic work-area + workbench
        // for any orphan shape on save — no need to require a wrapper here.
        const workAreaParent = nodes.find((n) => {
          if (n.type !== 'workarea') return false;
          const w = typeof n.style?.width  === 'number' ? n.style.width  : 540;
          const h = typeof n.style?.height === 'number' ? n.style.height : 360;
          return (
            position.x >= n.position.x && position.x <= n.position.x + w &&
            position.y >= n.position.y + 36 && position.y <= n.position.y + h
          );
        });

        const relativePos = workAreaParent
          ? { x: position.x - workAreaParent.position.x,
              y: position.y - workAreaParent.position.y }
          : position;

        const newNode: WorkflowNode = {
          id: nextId(),
          // xyflow node type — `DynamicShapeNode` reads `data.definitionSlug`
          // and draws the SVG straight out of the catalog.
          type: 'shape' as unknown as WorkflowNodeType,
          position: relativePos,
          style: { width: def.default_width, height: def.default_height },
          data: {
            label: def.default_label || def.label,
            nodeType: 'shape' as unknown as WorkflowNodeType,
            definitionSlug: def.slug,
            properties: {},
          } as unknown as WorkflowNodeData,
          ...(workAreaParent ? { parentId: workAreaParent.id, extent: 'parent' as const } : {}),
        };

        setNodes((nds) => [...nds, newNode]);
        setIsDirty(true);
        return;
      }

      // ── Work Area drop (not modelled as a catalog shape) ─────────────────
      if (payload === 'workarea') {
        const WA_WIDTH = 540;
        const WA_HEIGHT = 360;
        const waId = nextId();

        const newWorkArea: WorkflowNode = {
          id: waId,
          type: 'workarea',
          position,
          style: { width: WA_WIDTH, height: WA_HEIGHT },
          data: { label: 'Work Area', nodeType: 'workarea' },
        };

        setNodes((nds) => {
          const enclosed = nds.filter((n) => {
            if (n.type === 'workarea' || n.parentId) return false;
            const nw = (n.measured?.width ?? n.width) ?? 220;
            const nh = (n.measured?.height ?? n.height) ?? 100;
            const cx = n.position.x + nw / 2;
            const cy = n.position.y + nh / 2;
            return (
              cx >= position.x &&
              cx <= position.x + WA_WIDTH &&
              cy >= position.y &&
              cy <= position.y + WA_HEIGHT
            );
          });

          const enclosedIds = new Set(enclosed.map((n) => n.id));

          return [
            newWorkArea,
            ...nds.map((n) => {
              if (!enclosedIds.has(n.id)) return n;
              return {
                ...n,
                parentId: waId,
                extent: 'parent' as const,
                position: {
                  x: n.position.x - position.x,
                  y: n.position.y - position.y,
                },
              };
            }),
          ];
        });

        setIsDirty(true);
        return;
      }
    },
    [screenToFlowPosition, setNodes, nodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n,
        ),
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  const updateWorkflowMeta = useCallback((updates: Partial<WorkflowMeta>) => {
    setWorkflowMeta((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const deleteNode = useCallback(
    (nodeId: string) => {
      const isWorkArea = nodes.find((n) => n.id === nodeId)?.type === 'workarea';

      if (isWorkArea) {
        const childIds = new Set(nodes.filter((n) => n.parentId === nodeId).map((n) => n.id));
        const allToRemove = new Set([nodeId, ...childIds]);
        setNodes((nds) => nds.filter((n) => !allToRemove.has(n.id)));
        setEdges((eds) =>
          eds.filter((e) => !allToRemove.has(e.source) && !allToRemove.has(e.target)),
        );
      } else {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      }

      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      setIsDirty(true);
    },
    [setNodes, setEdges, selectedNodeId, nodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: WorkflowNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      const hasMeaningfulChange = changes.some(
        (c) => c.type === 'position' || c.type === 'remove' || c.type === 'add',
      );
      if (hasMeaningfulChange) setIsDirty(true);
    },
    [onNodesChange],
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const hasMeaningfulChange = changes.some(
        (c) => c.type === 'remove' || c.type === 'add',
      );
      if (hasMeaningfulChange) setIsDirty(true);
    },
    [onEdgesChange],
  );

  return {
    nodes,
    edges,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    onNodeClick,
    onPaneClick,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    updateNodeData,
    deleteNode,
    workflowMeta,
    setWorkflowMeta,
    updateWorkflowMeta,
    isDirty,
    isSaving,
    saveWorkflow,
    loadFromJSON,
    serializeCanvas,
    rfInstance,
    selectedEdgeId,
    selectedEdge,
    onEdgeClick,
    labelEdge,
    loading: false,
  };
}
