import { useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2, Wand2, X } from 'lucide-react';
import {
  useCanvasChangeSetActions,
  useCanvasChangeSetDetail,
  useOpenCanvasChangeSets,
} from '../hooks/useWorkflowRuleChangeSets';
import type { CanvasRuleChangeProposal, RuleChangeKind } from '@/lib/sopChangesApi';
import { cn } from '@/utils/utils';

/**
 * Review for pending builder-canvas rule changes (add/edit/delete of an
 * SOP-derived or custom rule) on one workflow.
 *
 * Mirrors SopVersionPreviewPanel.tsx's shape (master-detail proposal list +
 * before/after diff + Approve/Reject) but for `source=canvas` batches: the
 * canonical rule is untouched until Approve, which is also the only thing
 * that creates a new WorkflowVersion for these edits. Reject discards the
 * batch with zero side effects — no version bump, no history row.
 */

interface Props {
  workflowId: string;
  onClose: () => void;
  /** Refresh the canvas/version history once a batch is approved or rejected. */
  onReviewed?: () => void;
}

const KIND_BADGE: Record<RuleChangeKind, { label: string; className: string }> = {
  modified: {
    label: 'Modified',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  added: {
    label: 'New',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  removed: {
    label: 'Removed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

const FIELD_LABELS: Record<string, string> = {
  condition: 'Condition',
  action: 'Action',
  decision_type: 'Decision',
  codes: 'Codes',
  subrule_id: 'Sub-rule ID',
};

function fieldText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function FieldDiff({
  field,
  previous,
  current,
  kind,
}: {
  field: string;
  previous: unknown;
  current: unknown;
  kind: RuleChangeKind;
}) {
  const label = FIELD_LABELS[field] ?? field;
  const prevText = fieldText(previous);
  const curText = fieldText(current);

  if (kind === 'added') {
    if (!curText) return null;
    return (
      <div>
        <FieldLabel label={label} />
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-emerald-950 dark:text-emerald-200">
            {curText}
          </p>
        </div>
      </div>
    );
  }

  if (kind === 'removed') {
    if (!prevText) return null;
    return (
      <div>
        <FieldLabel label={label} />
        <div className="rounded border border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/40">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-red-950 line-through decoration-red-400 dark:text-red-200">
            {prevText}
          </p>
        </div>
      </div>
    );
  }

  const unchanged = prevText === curText;
  if (unchanged && !prevText) return null;
  return (
    <div>
      <FieldLabel
        label={label}
        badge={unchanged ? { label: 'Unchanged', className: 'bg-muted text-muted-foreground' } : undefined}
      />
      <div className="grid overflow-hidden rounded border border-border md:grid-cols-2">
        <div className="border-b border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/30 md:border-b-0 md:border-r">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase text-red-700 dark:text-red-400">
            <X className="h-3 w-3" /> Previous
          </div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-red-950 dark:text-red-200">
            {prevText || '—'}
          </p>
        </div>
        <div className="bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
            <Check className="h-3 w-3" /> New
          </div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-emerald-950 dark:text-emerald-200">
            {curText || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, badge }: { label: string; badge?: { label: string; className: string } }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {badge && (
        <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide', badge.className)}>
          {badge.label}
        </span>
      )}
    </div>
  );
}

const DIFF_FIELDS = ['condition', 'action', 'decision_type', 'codes', 'subrule_id'] as const;

export default function WorkflowRuleChangeReviewPanel({ workflowId, onClose, onReviewed }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: openBatches, isLoading: batchesLoading } = useOpenCanvasChangeSets(workflowId);
  const batches = useMemo(() => openBatches?.results ?? [], [openBatches]);

  // Derived, not effect-synced: defaults to the most recently active open
  // batch until the reviewer explicitly picks a different one from the list.
  const [manualChangeSetId, setManualChangeSetId] = useState<number | null>(null);
  const changeSetId = manualChangeSetId ?? batches[0]?.id ?? null;

  const { data: changeSet, isLoading: detailLoading } = useCanvasChangeSetDetail(changeSetId);
  const proposals = useMemo(() => changeSet?.proposals ?? [], [changeSet]);
  const selected = proposals.find((p) => p.id === selectedId) ?? proposals[0] ?? null;

  const { approve, reject } = useCanvasChangeSetActions(workflowId);
  const busy = approve.isPending || reject.isPending;

  const finish = () => {
    onReviewed?.();
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-border bg-background shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wand2 className="h-3.5 w-3.5" />
            <span>Pending canvas rule changes</span>
          </div>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {changeSet ? `v${changeSet.from_version} → v${changeSet.to_version}` : 'Review'}
            {changeSet && <span className="ml-2 text-xs font-normal text-muted-foreground">by {changeSet.created_by}</span>}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </header>

      {batches.length > 1 && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-[11px]">
          <span className="text-muted-foreground">Batch:</span>
          <div className="relative">
            <select
              value={changeSetId ?? ''}
              onChange={(e) => { setManualChangeSetId(Number(e.target.value)); setSelectedId(null); }}
              className="appearance-none rounded border border-border bg-background py-1 pl-2 pr-6 text-[11px]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.created_by || 'unknown'} · {b.proposal_count} rule{b.proposal_count === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}

      {!batchesLoading && batches.length === 0 && (
        <div className="flex-1 p-6">
          <p className="rounded border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            No pending rule changes for this workflow.
          </p>
        </div>
      )}

      {changeSetId != null && (
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
          <aside className="overflow-y-auto border-b border-border bg-muted/30 md:border-b-0 md:border-r">
            <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Changed rules
            </div>
            {proposals.map((proposal: CanvasRuleChangeProposal) => (
              <button
                key={proposal.id}
                type="button"
                onClick={() => setSelectedId(proposal.id)}
                className={cn(
                  'w-full border-l-2 px-3 py-2.5 text-left transition-colors',
                  selected?.id === proposal.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
                )}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {proposal.is_custom && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 py-0.5 text-[9px] font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                      <Wand2 className="h-2.5 w-2.5" /> Custom
                    </span>
                  )}
                  <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold uppercase', KIND_BADGE[proposal.change_kind].className)}>
                    {KIND_BADGE[proposal.change_kind].label}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs font-medium leading-4 text-foreground">
                  {proposal.title || proposal.display_rule_id || proposal.rule_key}
                </div>
                {proposal.node_key && (
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{proposal.node_key}</div>
                )}
              </button>
            ))}
            {detailLoading && (
              <div className="flex items-center gap-2 px-3 py-6 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            )}
          </aside>

          <div className="space-y-4 overflow-y-auto p-4">
            {selected ? (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {selected.display_rule_id || selected.rule_key}
                    </span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', KIND_BADGE[selected.change_kind].className)}>
                      {KIND_BADGE[selected.change_kind].label}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selected.title || selected.rule_key}
                  </h3>
                  {selected.node_key && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      On node <span className="font-semibold text-foreground">{selected.node_key}</span>
                    </p>
                  )}
                </div>

                {DIFF_FIELDS.map((field) => (
                  <FieldDiff
                    key={field}
                    field={field}
                    previous={selected.previous[field as keyof typeof selected.previous]}
                    current={selected.current[field as keyof typeof selected.current]}
                    kind={selected.change_kind}
                  />
                ))}
              </>
            ) : (
              !detailLoading && (
                <p className="py-8 text-center text-xs text-muted-foreground">Nothing to review.</p>
              )
            )}
          </div>
        </div>
      )}

      {changeSetId != null && (
        <footer className="border-t border-border p-3">
          {actionError && (
            <p className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {actionError}
            </p>
          )}
          {changeSet?.stale && (
            <p className="mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              This workflow changed since this batch opened — reopen before approving.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !proposals.length || changeSet?.stale}
              onClick={() => {
                setActionError(null);
                approve.mutate(
                  { changeSetId: changeSetId as number, proposalIds: proposals.map((p) => p.id) },
                  { onSuccess: finish, onError: (e) => setActionError(readError(e)) },
                );
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setActionError(null);
                reject.mutate(
                  { changeSetId: changeSetId as number },
                  { onSuccess: finish, onError: (e) => setActionError(readError(e)) },
                );
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {reject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Reject
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Approving applies these rule changes and creates a new workflow version. Rejecting discards them.
          </p>
        </footer>
      )}
    </div>
  );
}

function readError(e: unknown): string {
  const body = (e as { body?: unknown })?.body;
  if (body && typeof body === 'object' && 'detail' in body) {
    return String((body as Record<string, unknown>).detail);
  }
  return (e as Error)?.message || 'Something went wrong.';
}