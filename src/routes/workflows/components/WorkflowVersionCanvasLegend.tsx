import { Panel, useReactFlow } from '@xyflow/react';
import { useWorkflowVersions } from '../hooks/useWorkflowVersions';
import type { WorkflowNode } from '../types';

interface WorkflowVersionCanvasLegendProps {
  workflowId: string;
  nodes: WorkflowNode[];
}

/** Small floating legend that labels which SOPs (and versions) make up the
 *  live canvas. Reads the same `useWorkflowVersions` query the version-history
 *  drawer uses (React Query dedupes by key, so no extra request), but only
 *  ever shows the current/latest snapshot — the canvas always reflects live
 *  state, never a historical one. */
export default function WorkflowVersionCanvasLegend({
  workflowId,
  nodes,
}: WorkflowVersionCanvasLegendProps) {
  const { data: versions } = useWorkflowVersions(workflowId);
  const { fitView } = useReactFlow();
  const current = versions?.[0];

  if (!current || current.sops.length === 0) return null;

  return (
    <Panel position="top-left">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        {[...current.sops]
          .sort((a, b) => a.order - b.order)
          .map((sop) => {
            const matchingIds = nodes
              .filter((n) => (n.data as { workbenchId?: string }).workbenchId === sop.workbench_id)
              .map((n) => ({ id: n.id }));
            return (
              <button
                key={sop.workbench_id}
                type="button"
                disabled={matchingIds.length === 0}
                onClick={() =>
                  fitView({ nodes: matchingIds, padding: 0.3, duration: 400 })
                }
                className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60"
                title={`${sop.sop_title || sop.node_key} — v${sop.sop_version_number}`}
              >
                {sop.sop_title || sop.node_key}
                <span className="ml-1 text-muted-foreground">v{sop.sop_version_number}</span>
              </button>
            );
          })}
      </div>
    </Panel>
  );
}
