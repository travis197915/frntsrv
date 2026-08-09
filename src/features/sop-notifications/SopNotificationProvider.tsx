import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { sopChangesApi } from '@/lib/sopChangesApi';
import type { SopChangeNotification } from './types';

/**
 * Re-ingested SOPs waiting on a decision, across every workflow.
 *
 * These are not app-local notifications — each one is an open change set on the
 * backend, so the list is derived rather than stored. It clears when the batch
 * is approved or rejected, by anyone, which is why there is no read/unread
 * state to keep in sync: the only meaningful status is "still open".
 *
 * The review itself lives on the workflow (`SopVersionPreviewPanel`), where the
 * canvas the change affects is visible. The bell's job is to say which
 * workflows are waiting and take you there.
 */

const POLL_MS = 60_000;

interface SopNotificationContextValue {
  notifications: SopChangeNotification[];
  pendingNotifications: SopChangeNotification[];
  unreadCount: number;
  isLoading: boolean;
  /** Navigate to the workflow and open the review for that SOP version. */
  openNotification: (id: string) => void;
  refresh: () => void;
}

const SopNotificationContext = createContext<SopNotificationContextValue | null>(
  null,
);

export function useSopNotifications() {
  const context = useContext(SopNotificationContext);
  if (!context) {
    throw new Error(
      'useSopNotifications must be used within SopNotificationProvider',
    );
  }
  return context;
}

export function SopNotificationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sop-open-change-sets'],
    queryFn: () => sopChangesApi.listOpen(),
    refetchInterval: POLL_MS,
    // Ingestion takes ~12 minutes, so a batch can appear while the user is on
    // another page. Refetching on focus keeps the badge honest without a
    // socket.
    refetchOnWindowFocus: true,
  });

  const notifications = useMemo<SopChangeNotification[]>(
    () =>
      (data?.results ?? [])
        // A batch with no workflow has nowhere to navigate to; it would be a
        // dead entry in the list.
        .filter((row) => row.workflow?.id)
        .map((row) => ({
          id: String(row.id),
          changeSetId: row.id,
          workflowId: row.workflow!.id as string,
          workflowName: row.workflow!.name || 'Untitled workflow',
          sopId: row.to_sop?.id ?? row.sop.id,
          sopTitle: row.sop.title,
          fromVersion: row.from_version,
          toVersion: row.to_version,
          ruleCount: row.proposal_count,
          summary: row.summary,
          stale: row.stale,
          createdAt: row.created_at,
        })),
    [data],
  );

  const value = useMemo<SopNotificationContextValue>(
    () => ({
      notifications,
      pendingNotifications: notifications,
      unreadCount: notifications.length,
      isLoading,
      openNotification: (id) => {
        const target = notifications.find((n) => n.id === id);
        if (!target) return;
        // `review` is picked up by the workflow page, which opens the diff for
        // that SOP version once the context panel has loaded.
        navigate(`/workflows/${target.workflowId}?review=${target.sopId}`);
      },
      refresh: () => {
        void queryClient.invalidateQueries({
          queryKey: ['sop-open-change-sets'],
        });
      },
    }),
    [notifications, isLoading, navigate, queryClient],
  );

  return (
    <SopNotificationContext.Provider value={value}>
      {children}
    </SopNotificationContext.Provider>
  );
}
