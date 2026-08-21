import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  MinusCircle,
  PlusCircle,
  X,
} from 'lucide-react';
import { sopChangesApi } from '@/lib/sopChangesApi';
import type {
  RuleChangeKind,
  RuleChangeProposal,
} from '@/lib/sopChangesApi';
import { workflowsApi } from '@/lib/workflowsApi';
import { cn } from '@/utils/utils';

/**
 * The review for one pending SOP version, opened from its card.
 *
 * Shows the rule-level diff the re-ingestion raised, and approves or rejects
 * the batch. Approving is what adopts the version: it repoints this workflow's
 * bindings to the new SOP and activates it. Until then the canvas keeps
 * executing the old version, which is why the card badges it "Pending review".
 *
 * The rollout impact strip above the diff comes from the same planner the
 * approval executes, so "7 rules will be detached" is a fact about what the
 * button does, not an estimate.
 */

interface Props {
  workflowId: string;
  sopId: number;
  versionLabel: string;
  onClose: () => void;
  /** Refresh the SOP cards once a batch is approved or rejected. */
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded border border-border bg-muted/40 px-2 py-1.5 text-center">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/**
 * One field of the rule.
 *
 * A before/after pair only makes sense for a `modified` rule. An added rule has
 * no previous side and a removed one has no new side, so two panes would leave
 * one permanently blank. Each kind renders the side that exists.
 */
function FieldDiff({
  label,
  previous,
  current,
  kind,
}: {
  label: string;
  previous: string | null;
  current: string | null;
  kind: RuleChangeKind;
}) {
  if (kind === 'added') {
    if (!current) return null;
    return (
      <div>
        <FieldLabel label={label} badge={KIND_BADGE.added} />
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-emerald-950 dark:text-emerald-200">
            {current}
          </p>
        </div>
      </div>
    );
  }

  if (kind === 'removed') {
    if (!previous) return null;
    return (
      <div>
        <FieldLabel label={label} badge={KIND_BADGE.removed} />
        <div className="rounded border border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/40">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-red-950 line-through decoration-red-400 dark:text-red-200">
            {previous}
          </p>
        </div>
      </div>
    );
  }

  const unchanged = previous === current;
  return (
    <div>
      <FieldLabel
        label={label}
        badge={
          unchanged
            ? { label: 'Unchanged', className: 'bg-muted text-muted-foreground' }
            : undefined
        }
      />
      <div className="grid overflow-hidden rounded border border-border md:grid-cols-2">
        <div className="border-b border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/30 md:border-b-0 md:border-r">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase text-red-700 dark:text-red-400">
            <X className="h-3 w-3" /> Previous
          </div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-red-950 dark:text-red-200">
            {previous || '—'}
          </p>
        </div>
        <div className="bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
            <Check className="h-3 w-3" /> New
          </div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-emerald-950 dark:text-emerald-200">
            {current || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  badge,
}: {
  label: string;
  badge?: { label: string; className: string };
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {badge && (
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
            badge.className,
          )}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}

export default function SopVersionPreviewPanel({
  workflowId,
  sopId,
  versionLabel,
  onClose,
  onReviewed,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // The impact strip: what approving does to THIS canvas, from the same
  // planner the approval runs.
  const { data: preview } = useQuery({
    queryKey: ['sop-version-preview', workflowId, sopId],
    queryFn: () => workflowsApi.getVersionPreview(workflowId, sopId),
  });

  const changeSetId = preview?.change_set?.id ?? null;

  const {
    data: changeSet,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sop-change-set', changeSetId],
    queryFn: () => sopChangesApi.get(changeSetId as number),
    enabled: changeSetId != null,
  });

  const proposals = useMemo(() => changeSet?.proposals ?? [], [changeSet]);
  const selected =
    proposals.find((p) => p.id === selectedId) ?? proposals[0] ?? null;

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: ['sop-version-preview'] });
    void queryClient.invalidateQueries({ queryKey: ['sop-change-set'] });
    onReviewed?.();
    onClose();
  };

  const approve = useMutation({
    mutationFn: () =>
      sopChangesApi.approve(
        changeSetId as number,
        proposals.map((p) => p.id),
      ),
    onSuccess: finish,
    onError: (e) => setActionError(readError(e)),
  });

  const reject = useMutation({
    mutationFn: () => sopChangesApi.reject(changeSetId as number),
    onSuccess: finish,
    onError: (e) => setActionError(readError(e)),
  });

  // Nothing has ever opened a review for this workflow+version pair — e.g.
  // the version was activated directly, or this workflow wasn't the one an
  // ingestion job named. Starting one just creates the same reviewable batch
  // a real re-ingestion would; the diff/approve UI below takes over once the
  // preview refetches and finds it.
  const adopt = useMutation({
    mutationFn: () => workflowsApi.adoptSopVersion(workflowId, sopId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['sop-version-preview', workflowId, sopId],
      });
    },
    onError: (e) => setActionError(readError(e)),
  });

  const busy = approve.isPending || reject.isPending;
  const report = preview?.report;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-border bg-background shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {preview?.projected && (
              <span className="inline-flex items-center gap-1 font-semibold">
                v{preview.from_version_number}
                <ArrowRight className="h-3 w-3" />v{preview.version_number}
              </span>
            )}
            {changeSet && <span>· {changeSet.proposal_count} rules changed</span>}
          </div>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {versionLabel}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {report && (report.dropped > 0 || report.unplaced_count > 0) && (
        <div className="space-y-1.5 border-b border-border px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            <Stat value={report.repointed} label="move" />
            <Stat value={report.dropped} label="detached" />
            <Stat value={report.unplaced_count} label="new" />
            <Stat value={report.preserved} label="kept edits" />
          </div>
          {report.dropped > 0 && (
            <p className="flex items-start gap-2 text-[11px] text-red-700 dark:text-red-400">
              <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Approving detaches {report.dropped} rule
              {report.dropped === 1 ? '' : 's'} from the canvas.
            </p>
          )}
          {report.unplaced_count > 0 && (
            <p className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
              <PlusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {report.unplaced_count} new rule
              {report.unplaced_count === 1 ? '' : 's'} will need placing on a
              node afterwards.
            </p>
          )}
        </div>
      )}

      {changeSetId == null && !isLoading && (
        <div className="flex-1 p-6">
          {preview?.projected === false ? (
            <p className="rounded border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
              This is the version the canvas is running — there is nothing pending to review.
            </p>
          ) : (
            <div className="space-y-3 rounded border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">
                No review has been started for this version yet — this can
                happen when the version was activated directly, or this
                workflow wasn't the one a re-ingestion targeted. Starting one
                creates the same reviewable diff a re-ingestion would.
              </p>
              {actionError && (
                <p className="rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {actionError}
                </p>
              )}
              <button
                type="button"
                disabled={adopt.isPending}
                onClick={() => {
                  setActionError(null);
                  adopt.mutate();
                }}
                className="flex items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {adopt.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Start review — adopt {versionLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {changeSetId != null && (
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
          <aside className="overflow-y-auto border-b border-border bg-muted/30 md:border-b-0 md:border-r">
            <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Changed rules
            </div>
            {proposals.map((proposal: RuleChangeProposal) => (
              <button
                key={proposal.id}
                type="button"
                onClick={() => setSelectedId(proposal.id)}
                className={cn(
                  'w-full border-l-2 px-3 py-2.5 text-left transition-colors',
                  selected?.id === proposal.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:bg-muted',
                )}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {proposal.step_number}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {proposal.display_rule_id}
                  </span>
                  {proposal.change_kind !== 'modified' && (
                    <span
                      className={cn(
                        'rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                        KIND_BADGE[proposal.change_kind].className,
                      )}
                    >
                      {KIND_BADGE[proposal.change_kind].label}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs font-medium leading-4 text-foreground">
                  {proposal.title || `Step ${proposal.step_number}`}
                </div>
              </button>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-6 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            )}
          </aside>

          <div className="space-y-4 overflow-y-auto p-4">
            {error && (
              <p className="text-xs text-red-600">
                {(error as Error).message || 'Could not load the diff.'}
              </p>
            )}
            {selected ? (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {selected.display_rule_id}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                        KIND_BADGE[selected.change_kind].className,
                      )}
                    >
                      {KIND_BADGE[selected.change_kind].label}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selected.title || `Step ${selected.step_number}`}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    In{' '}
                    <span className="font-semibold text-foreground">
                      Step {selected.step_number}
                    </span>
                    {selected.step_label ? ` · ${selected.step_label}` : ''}
                    {' · '}Row {selected.row_index}
                  </p>
                  {selected.change_kind !== 'modified' && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selected.change_kind === 'added'
                        ? 'Not in the running version. Approving adds it to the SOP; it still needs attaching to a node.'
                        : 'Gone from the new document. Approving detaches it from the canvas.'}
                    </p>
                  )}
                </div>

                <FieldDiff
                  label="Condition"
                  previous={selected.previous.condition_if}
                  current={selected.current.condition_if}
                  kind={selected.change_kind}
                />
                <FieldDiff
                  label="Action"
                  previous={selected.previous.action_text}
                  current={selected.current.action_text}
                  kind={selected.change_kind}
                />

                {selected.dependent_steps.length > 0 && (
                  <p className="flex gap-2 rounded border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      Routes to{' '}
                      <strong className="text-foreground">
                        {selected.dependent_steps
                          .map((s) => `Step ${s.step_number} · ${s.label}`)
                          .join(', ')}
                      </strong>
                    </span>
                  </p>
                )}
              </>
            ) : (
              !isLoading && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Nothing to review.
                </p>
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
              The SOP moved since this batch opened — reopen before approving.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !proposals.length || changeSet?.stale}
              onClick={() => {
                setActionError(null);
                approve.mutate();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {approve.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setActionError(null);
                reject.mutate();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {reject.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Reject
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Approving repoints this workflow's canvas and makes v
            {preview?.version_number} current.
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
