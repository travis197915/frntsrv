import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { sopChangesApi } from '@/lib/sopChangesApi';
import type { CanvasChangeSet } from '@/lib/sopChangesApi';

/**
 * Pending builder-canvas rule changes (add/edit/delete of an SOP-derived or
 * custom rule) for one workflow — the `source=canvas` sibling of the SOP
 * change-set review flow (`sopChangesApi`), reusing the exact same
 * `/rule-changesets/` endpoints and status/staleness semantics.
 *
 * A canvas rule edit never touches the live rule until its batch is
 * approved here, so this list is also what drives the "Pending review"
 * badge on an edited rule/node.
 */

export const canvasChangeSetKeys = {
  openForWorkflow: (workflowId: string) =>
    ['canvas-change-sets', 'open', workflowId] as const,
  detail: (changeSetId: number) => ['canvas-change-set', changeSetId] as const,
};

const STALE_15S = 15_000;

/** Every OPEN canvas batch for this workflow — polled lightly since more than
 *  one auditor may be editing the same workflow concurrently. */
export function useOpenCanvasChangeSets(workflowId: string | undefined) {
  return useQuery({
    queryKey: canvasChangeSetKeys.openForWorkflow(workflowId ?? ''),
    queryFn: () => sopChangesApi.listOpenForWorkflow(workflowId as string),
    enabled: Boolean(workflowId),
    staleTime: STALE_15S,
    refetchInterval: STALE_15S * 2,
  });
}

/** One canvas batch in full (its proposals), fetched on demand when a
 *  reviewer opens it. */
export function useCanvasChangeSetDetail(changeSetId: number | null) {
  return useQuery({
    queryKey: canvasChangeSetKeys.detail(changeSetId ?? -1),
    queryFn: () => sopChangesApi.get<CanvasChangeSet>(changeSetId as number),
    enabled: changeSetId != null,
  });
}

/**
 * Every `shape_id:rule_key` with an open canvas proposal, across every open
 * batch for this workflow (any author) — so the canvas can badge a rule
 * "Pending review" no matter who proposed the edit, not just the viewer's
 * own batch. The list endpoint doesn't carry proposals, so this fetches
 * detail for each open batch in parallel; the number of concurrently open
 * canvas batches per workflow is expected to be small (one per active
 * author), so this stays cheap.
 */
export function usePendingCanvasRuleKeys(workflowId: string | undefined) {
  const { data: openBatches } = useOpenCanvasChangeSets(workflowId);
  const batchIds = useMemo(
    () => (openBatches?.results ?? []).map((b) => b.id),
    [openBatches],
  );

  const detailQueries = useQueries({
    queries: batchIds.map((id) => ({
      queryKey: canvasChangeSetKeys.detail(id),
      queryFn: () => sopChangesApi.get<CanvasChangeSet>(id),
      staleTime: STALE_15S,
    })),
  });

  return useMemo(() => {
    const byShape = new Map<string, Set<string>>();
    for (const q of detailQueries) {
      for (const proposal of q.data?.proposals ?? []) {
        if (!proposal.shape_id) continue;
        const set = byShape.get(proposal.shape_id) ?? new Set<string>();
        set.add(proposal.rule_key);
        byShape.set(proposal.shape_id, set);
      }
    }
    return byShape;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQueries.map((q) => q.dataUpdatedAt).join(',')]);
}

/** Approve/reject mutations for a canvas batch, mirroring
 *  SopVersionPreviewPanel's pattern: invalidate by query-key prefix so both
 *  the open-batches list and the notification surfaces refresh. */
export function useCanvasChangeSetActions(workflowId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (workflowId) {
      void queryClient.invalidateQueries({
        queryKey: canvasChangeSetKeys.openForWorkflow(workflowId),
      });
    }
    void queryClient.invalidateQueries({ queryKey: ['canvas-change-set'] });
    void queryClient.invalidateQueries({ queryKey: ['workflow-versions'] });
  };

  const approve = useMutation({
    mutationFn: ({ changeSetId, proposalIds }: { changeSetId: number; proposalIds: number[] }) =>
      sopChangesApi.approve(changeSetId, proposalIds),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ changeSetId, note }: { changeSetId: number; note?: string }) =>
      sopChangesApi.reject(changeSetId, note),
    onSuccess: invalidate,
  });

  return { approve, reject };
}