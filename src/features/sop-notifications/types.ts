/**
 * One workflow waiting on a SOP-change decision.
 *
 * Derived from an open `RuleChangeSet` on the backend rather than stored
 * locally, so there is no read/unread state — a batch is in the list until
 * someone approves or rejects it.
 */
export interface SopChangeNotification {
  /** String form of `changeSetId`, for list keys. */
  id: string;
  changeSetId: number;
  workflowId: string;
  workflowName: string;
  /** The pending version — what the workflow's review panel opens on. */
  sopId: number;
  sopTitle: string;
  /** Document snapshots: the "v1 → v2" the card and header render. */
  fromVersion: number;
  toVersion: number;
  ruleCount: number;
  summary: { modified: number; added: number; removed: number };
  /** The SOP moved on since the batch opened; it must be re-diffed. */
  stale: boolean;
  createdAt: string;
}
