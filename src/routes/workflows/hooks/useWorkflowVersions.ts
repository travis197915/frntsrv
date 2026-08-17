import { useQuery } from '@tanstack/react-query';
import { workflowsApi } from '@/lib/workflowsApi';

export const workflowVersionKeys = {
  list: (workflowId: string) => ['workflow-versions', workflowId] as const,
  detail: (workflowId: string, versionNumber: number) =>
    ['workflow-versions', workflowId, versionNumber] as const,
};

const STALE_30S = 30_000;

/** Full version history for a workflow, newest first. Each item already
 *  carries its full SOP composition — no waterfall fetch needed to render
 *  the history list/tree. */
export function useWorkflowVersions(workflowId: string | undefined) {
  return useQuery({
    queryKey: workflowVersionKeys.list(workflowId ?? ''),
    queryFn: () => workflowsApi.versions(workflowId as string),
    enabled: Boolean(workflowId),
    staleTime: STALE_30S,
  });
}

/** One frozen WorkflowVersion snapshot, fetched on demand (e.g. to refresh a
 *  selected historical row before expanding it). */
export function useWorkflowVersionDetail(
  workflowId: string | undefined,
  versionNumber: number | null,
) {
  return useQuery({
    queryKey: workflowVersionKeys.detail(workflowId ?? '', versionNumber ?? -1),
    queryFn: () =>
      workflowsApi.versionDetail(workflowId as string, versionNumber as number),
    enabled: Boolean(workflowId) && versionNumber != null,
    staleTime: STALE_30S,
  });
}
