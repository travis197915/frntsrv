import { ingestClient } from './clients';

/**
 * Rule-change review — the diff a SOP re-upload raises, and its approval.
 *
 * Approving a batch is what adopts the new SOP version: it repoints this
 * workflow's rule bindings and activates the version. Ingestion only parks it
 * at `pending_review`. This is deliberately the *only* way to adopt a version
 * a change set owns — the document-level activate endpoint bypasses the
 * rollout and would leave the badges saying "current" while the canvas kept
 * executing the old version.
 */

export type RuleChangeKind = 'modified' | 'added' | 'removed';

export interface RuleFields {
  condition_if: string | null;
  condition_and: string | null;
  action_text: string | null;
  output_text: string | null;
  applicable_when: string | null;
  decision_type: string | null;
  is_out_of_scope: boolean | null;
  tooling_allowed: boolean | null;
}

export interface DependentStep {
  step_number: number;
  label: string;
}

export interface RuleChangeProposal {
  id: number;
  decision_id: number | null;
  to_decision_id: number | null;
  change_kind: RuleChangeKind;
  /** `RULE-005-001`, or `Step 5 · Row 3` when the SOP has no subrule ids. */
  display_rule_id: string;
  subrule_id: string;
  title: string;
  step_number: number;
  /** The step this rule lives in — distinct from `dependent_steps`, which is
   *  where it routes TO. Empty when the step has no question (common on step 0). */
  step_label: string;
  row_index: number;
  rule_key: string;
  to_rule_key: string | null;
  base_revision: number;
  /**
   * Which of `previous`/`current` differ — the rest are context. For an
   * addition or removal this lists the fields the rule carries, since the
   * whole rule is arriving or leaving.
   */
  fields_changed: string[];
  previous: RuleFields;
  current: RuleFields;
  dependent_steps: DependentStep[];
  affected_workflows: { id: string; name: string }[];
  /** Only present on a `source=canvas` proposal (a builder-canvas rule edit). */
  shape_id?: string | null;
  workbench_id?: string | null;
  node_key?: string;
  is_custom?: boolean;
}

/** The canvas-specific rule fields — a subset of `RuleFields`' scope, since a
 *  canvas rule lives in `Shape.properties.sop_rules[]`, not `AuditDecision`. */
export interface CanvasRuleFields {
  condition?: string | null;
  action?: string | null;
  decision_type?: string | null;
  codes?: string[] | null;
  subrule_id?: string | null;
}

/** One rule's pending change inside a `source=canvas` change set — the
 *  canvas-review-panel analog of `RuleChangeProposal`. */
export interface CanvasRuleChangeProposal {
  id: number;
  shape_id: string | null;
  workbench_id: string | null;
  node_key: string;
  rule_key: string;
  change_kind: RuleChangeKind;
  is_custom: boolean;
  display_rule_id: string;
  subrule_id: string;
  title: string;
  fields_changed: string[];
  previous: CanvasRuleFields;
  current: CanvasRuleFields;
}

export interface SopChangeSet {
  id: number;
  status: string;
  stale: boolean;
  source: 'manual' | 'ingestion' | string;
  sop: { id: number; title: string; version: number; version_number: number };
  to_sop?: { id: number; version: number; version_number: number } | null;
  workflow?: { id: string | null; name: string } | null;
  workflow_names: string[];
  /** Document snapshots for an ingestion batch; rule-content versions otherwise. */
  from_version: number;
  to_version: number;
  summary: { modified: number; added: number; removed: number };
  proposal_count: number;
  created_by: string;
  created_at: string;
  reviewed_by: string;
  reviewed_at: string | null;
  review_note: string;
  proposals?: RuleChangeProposal[];
}

export interface SopChangeSetListItem {
  id: number;
  status: string;
  stale: boolean;
  source: string;
  sop: { id: number; title: string; version: number; version_number: number };
  to_sop?: { id: number; version: number; version_number: number } | null;
  workflow?: { id: string | null; name: string } | null;
  from_version: number;
  to_version: number;
  summary: { modified: number; added: number; removed: number };
  proposal_count: number;
  created_at: string;
}

/**
 * A `source=canvas` change set — a batch of pending builder-canvas rule
 * edits (add/edit/delete of an SOP-derived or custom rule), reviewed through
 * the SAME `/rule-changesets/` endpoints as SOP-ingestion/manual batches.
 * `sop` is null for a batch that only touches custom rules.
 */
export interface CanvasChangeSet {
  id: number;
  status: string;
  stale: boolean;
  source: 'canvas';
  sop: { id: number; title: string; version: number; version_number: number } | null;
  workflow: { id: string | null; name: string };
  workflow_names: string[];
  from_version: number;
  to_version: number;
  summary: { modified: number; added: number; removed: number };
  proposal_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  reviewed_by: string;
  reviewed_at: string | null;
  review_note: string;
  resulting_version: number | null;
  proposals?: CanvasRuleChangeProposal[];
}

export interface CanvasChangeSetListItem {
  id: number;
  status: string;
  stale: boolean;
  source: 'canvas';
  sop: { id: number; title: string; version: number; version_number: number } | null;
  workflow: { id: string | null; name: string };
  from_version: number;
  to_version: number;
  summary: { modified: number; added: number; removed: number };
  proposal_count: number;
  created_by: string;
  created_at: string;
}

export const sopChangesApi = {
  /**
   * Every re-ingestion batch still awaiting a decision, newest first.
   *
   * Scoped to `source=ingestion` on purpose: a manual rule edit is reviewed
   * from the rule itself, and mixing the two would put batches in the bell
   * that have no workflow to navigate to.
   */
  listOpen(limit = 25): Promise<{ count: number; results: SopChangeSetListItem[] }> {
    return ingestClient.get(
      `/rule-changesets/?status=open&source=ingestion&limit=${limit}`,
    );
  },

  /**
   * Every OPEN canvas rule-change batch (add/edit/delete of a rule on the
   * builder canvas) for one workflow, newest first. Powers the "pending
   * review" badges on the canvas and the review panel's batch list.
   */
  listOpenForWorkflow(
    workflowId: string,
    limit = 25,
  ): Promise<{ count: number; results: CanvasChangeSetListItem[] }> {
    return ingestClient.get(
      `/rule-changesets/?status=open&source=canvas&workflow_id=${workflowId}&limit=${limit}`,
    );
  },

  /** Generic so a canvas-sourced change set can be typed as `CanvasChangeSet`
   *  at the call site instead of `SopChangeSet` — same endpoint, the payload
   *  shape just differs by `source`. */
  get<T = SopChangeSet>(changeSetId: number): Promise<T> {
    return ingestClient.get<T>(`/rule-changesets/${changeSetId}/`);
  },

  /**
   * `proposalIds` must name exactly the proposals the reviewer saw. A mismatch
   * is a 409 `changeset_moved` — the batch changed while the panel was open.
   */
  approve(changeSetId: number, proposalIds: number[]) {
    return ingestClient.post(`/rule-changesets/${changeSetId}/approve/`, {
      proposal_ids: proposalIds,
    });
  },

  reject(changeSetId: number, note?: string) {
    return ingestClient.post(`/rule-changesets/${changeSetId}/reject/`, {
      note: note ?? '',
    });
  },
};
