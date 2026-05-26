import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ingestApi, type SopGraphResponse, type SopGraphNode, type SopGraphEdge } from '@/lib/api';
import { SopGraphCanvasLoading } from './SopGraphLoading';

// ── Node-type palette (mirrors the cytoscape viewer) ──────────────────────────
const TYPE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  DOCUMENT:    { bg: '#0f172a', fg: '#f8fafc', border: '#1e293b' },
  META:        { bg: '#dbeafe', fg: '#1e3a8a', border: '#60a5fa' },
  PRE_SECTION: { bg: '#fef3c7', fg: '#78350f', border: '#f59e0b' },
  PRE_RULE:    { bg: '#fde68a', fg: '#7c2d12', border: '#d97706' },
  STEP:        { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6' },
  DECISION:    { bg: '#e0f2fe', fg: '#0c4a6e', border: '#0284c7' },
  ANNOTATION:  { bg: '#fed7aa', fg: '#7c2d12', border: '#ea580c' },
  CODE:        { bg: '#fce7f3', fg: '#831843', border: '#db2777' },
  GROUP_LIMIT: { bg: '#ede9fe', fg: '#4c1d95', border: '#8b5cf6' },
  DATE_COND:   { bg: '#ccfbf1', fg: '#134e4a', border: '#14b8a6' },
  REFERENCE:   { bg: '#dcfce7', fg: '#14532d', border: '#22c55e' },
};
const DEFAULT_COLOR = { bg: '#f1f5f9', fg: '#475569', border: '#94a3b8' };

const NODE_W = 200;
const NODE_H = 60;

// ── Dagre layout ──────────────────────────────────────────────────────────────
function layout(nodes: SopGraphNode[], edges: SopGraphEdge[], direction: 'TB' | 'LR') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  const rfNodes: Node[] = nodes.map((n) => {
    const pos = g.node(n.id);
    const color = TYPE_COLORS[n.type] ?? DEFAULT_COLOR;
    return {
      id: n.id,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: n.label || n.id, type: n.type, details: n.details },
      style: {
        width: NODE_W,
        height: NODE_H,
        background: color.bg,
        color: color.fg,
        border: `1.5px solid ${color.border}`,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 500,
        padding: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center' as const,
        lineHeight: 1.2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      },
    };
  });

  const rfEdges: Edge[] = edges
    .filter((e) => g.hasNode(e.source) && g.hasNode(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      labelStyle: { fontSize: 9, fill: '#64748b' },
      labelBgStyle: { fill: '#fff' },
      labelBgPadding: [3, 1],
      labelBgBorderRadius: 3,
      style: { stroke: relColor(e.rel), strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: relColor(e.rel) },
      animated: false,
    }));

  return { rfNodes, rfEdges };
}

function relColor(rel: string): string {
  switch (rel) {
    case 'GOTO':      return '#3b82f6';
    case 'OVERRIDES': return '#ef4444';
    case 'IMPLIES':   return '#a855f7';
    case 'GUARDS':    return '#f59e0b';
    case 'CITED_BY':  return '#22c55e';
    case 'APPLIES_TO':return '#06b6d4';
    case 'USES_CODE': return '#db2777';
    case 'HAS_STEP':
    case 'HAS_PRE_SECTION':
    case 'HAS_RULE':  return '#94a3b8';
    default:          return '#64748b';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface SopGraphCanvasProps {
  jobId: string;
}

function FitViewHelper({
  containerRef,
  triggerKey,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerKey: string;
}) {
  const { fitView } = useReactFlow();

  const refit = useCallback(() => {
    requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 0 });
    });
  }, [fitView]);

  useEffect(() => {
    refit();
    const t = window.setTimeout(refit, 150);
    return () => clearTimeout(t);
  }, [triggerKey, refit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(refit, 100);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timeout);
    };
  }, [containerRef, refit]);

  return null;
}

interface SopGraphFlowProps {
  nodes: Node[];
  edges: Edge[];
  direction: 'TB' | 'LR';
  setDirection: (d: 'TB' | 'LR') => void;
  nodeCount: number;
  edgeCount: number;
  presentTypes: string[];
}

function SopGraphFlow({
  nodes,
  edges,
  direction,
  setDirection,
  nodeCount,
  edgeCount,
  presentTypes,
}: SopGraphFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="h-full w-full">
      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.05}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <FitViewHelper
          containerRef={containerRef}
          triggerKey={`${nodeCount}:${edgeCount}:${direction}`}
        />
        <Background variant={BackgroundVariant.Dots} gap={45} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={1} style={{ width: 180, height: 120 }} />

        <Panel position="top-left">
          <div className="flex gap-1 bg-background border border-border rounded-md p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setDirection('LR')}
              className={`text-xs px-2 py-1 rounded ${
                direction === 'LR' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Top-Down
            </button>
            <button
              type="button"
              onClick={() => setDirection('TB')}
              className={`text-xs px-2 py-1 rounded ${
                direction === 'TB' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Left-Right
            </button>
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="bg-background border border-border rounded-md p-2 shadow-sm max-w-[260px]">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              {nodeCount} nodes · {edgeCount} edges
            </p>
            <div className="flex flex-wrap gap-1">
              {presentTypes.map((t) => {
                const c = TYPE_COLORS[t] ?? DEFAULT_COLOR;
                return (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded border"
                    style={{ background: c.bg, color: c.fg, borderColor: c.border }}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function SopGraphCanvas({ jobId }: SopGraphCanvasProps) {
  const [data, setData] = useState<SopGraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    ingestApi.get<SopGraphResponse>(`/${jobId}/graph/`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [jobId]);

  const laid = useMemo(() => {
    if (!data) return null;
    return layout(data.nodes, data.edges, direction);
  }, [data, direction]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-destructive p-6">
        Failed to load graph: {error}
      </div>
    );
  }

  if (!data || !laid) {
    return <SopGraphCanvasLoading />;
  }

  if (data.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No graph data for this SOP yet.
      </div>
    );
  }

  // Build a legend from the actual node types present
  const presentTypes = Array.from(new Set(data.nodes.map((n) => n.type)));

  return (
    <ReactFlowProvider>
      <SopGraphFlow
        nodes={laid.rfNodes}
        edges={laid.rfEdges}
        direction={direction}
        setDirection={setDirection}
        nodeCount={data.nodes.length}
        edgeCount={data.edges.length}
        presentTypes={presentTypes}
      />
    </ReactFlowProvider>
  );
}
