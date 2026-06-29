import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  X,
  GitCompare,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FilePlus2,
  Equal,
  FileMinus2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  workflowsApi,
  type ReconcileAnalyzeResponse,
  type ReconcileFinding,
  type ReconcileRuleFields,
  type ReconcileVerdict,
} from '@/lib/workflowsApi';
import { cn } from '@/utils/utils';

const VERDICT_META: Record<
  ReconcileVerdict,
  { label: string; icon: typeof Equal; tone: string; actionable: boolean }
> = {
  CONTRADICT: {
    label: 'Contradicts',
    icon: AlertTriangle,
    tone: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-300',
    actionable: true,
  },
  AUGMENT: {
    label: 'Augments',
    icon: GitCompare,
    tone: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    actionable: true,
  },
  NEW: {
    label: 'New rule',
    icon: FilePlus2,
    tone: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    actionable: true,
  },
  IDENTICAL: {
    label: 'Identical',
    icon: Equal,
    tone: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    actionable: false,
  },
  MISSING: {
    label: 'Not in YAML',
    icon: FileMinus2,
    tone: 'text-muted-foreground bg-muted border-border',
    actionable: false,
  },
};

const FIELD_LABELS: Record<string, string> = {
  condition_if: 'Condition (IF)',
  condition_and: 'Condition (AND)',
  action_text: 'Action',
  output_text: 'Output (Met/Not-Met)',
  applicable_when: 'Applicable when',
  decision_type: 'Disposition',
  is_out_of_scope: 'Out of scope',
  tooling_allowed: 'Tooling allowed',
};

function findingKey(f: ReconcileFinding): string {
  return f.rule_key ?? `new:${f.subrule_id}`;
}

function fieldValue(src: ReconcileRuleFields | null | undefined, field: string): string {
  if (!src) return '';
  const v = (src as Record<string, unknown>)[field];
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return v == null ? '' : String(v);
}

interface Props {
  open: boolean;
  workbenchId: string;
  sopTitle: string;
  currentVersion: number | null;
  onClose: () => void;
  onApplied: (newVersion: number) => void;
}

export default function SopReconcileDialog({
  open,
  workbenchId,
  sopTitle,
  currentVersion,
  onClose,
  onApplied,
}: Props) {
  const [yamlText, setYamlText] = useState('');
  const [fileName, setFileName] = useState('pasted');
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconcileAnalyzeResponse | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [applied, setApplied] = useState<{ version: number; count: number } | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number; phase: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Cancellation guard + timer handle for the status-poll loop.
  const pollRef = useRef<{ active: boolean; timer: number | null }>({
    active: false,
    timer: null,
  });

  const stopPolling = useCallback(() => {
    pollRef.current.active = false;
    if (pollRef.current.timer != null) {
      window.clearTimeout(pollRef.current.timer);
      pollRef.current.timer = null;
    }
  }, []);

  // Stop polling if the dialog unmounts.
  useEffect(() => () => stopPolling(), [stopPolling]);

  const actionable = useMemo(
    () => (result?.findings ?? []).filter((f) => VERDICT_META[f.verdict].actionable),
    [result],
  );
  const unchanged = useMemo(
    () => (result?.findings ?? []).filter((f) => !VERDICT_META[f.verdict].actionable),
    [result],
  );
  const selectedCount = useMemo(
    () => actionable.filter((f) => selected[findingKey(f)]).length,
    [actionable, selected],
  );

  const reset = useCallback(() => {
    stopPolling();
    setResult(null);
    setSelected({});
    setExpanded({});
    setApplied(null);
    setError(null);
    setProgress(null);
    setAnalyzing(false);
  }, [stopPolling]);

  const onResult = useCallback((res: ReconcileAnalyzeResponse) => {
    setResult(res);
    // Pre-expand the diffs but leave acceptance to the auditor.
    const exp: Record<string, boolean> = {};
    res.findings.forEach((f) => {
      if (VERDICT_META[f.verdict].actionable) exp[findingKey(f)] = true;
    });
    setExpanded(exp);
    setSelected({});
  }, []);

  const analyze = useCallback(async () => {
    if (!yamlText.trim()) {
      setError('Paste or upload a SOP YAML first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    setApplied(null);
    setProgress(null);
    try {
      const { job_id } = await workflowsApi.reconcileAnalyze(
        workbenchId,
        yamlText,
        fileName,
      );
      // Poll the worker for progress; keep going until SUCCESS/FAILURE.
      pollRef.current.active = true;
      const poll = async () => {
        if (!pollRef.current.active) return;
        try {
          const s = await workflowsApi.reconcileStatus(workbenchId, job_id);
          if (!pollRef.current.active) return;
          if (s.state === 'PROGRESS') {
            setProgress({
              processed: s.processed ?? 0,
              total: s.total ?? 0,
              phase: s.phase ?? 'comparing',
            });
          } else if (s.state === 'SUCCESS' && s.result) {
            stopPolling();
            setProgress(null);
            setAnalyzing(false);
            onResult(s.result);
            return;
          } else if (s.state === 'FAILURE') {
            stopPolling();
            setProgress(null);
            setAnalyzing(false);
            setError(s.error || 'Analysis failed in the worker.');
            return;
          }
        } catch {
          // Transient poll error — keep trying until cancelled.
        }
        pollRef.current.timer = window.setTimeout(poll, 1500);
      };
      void poll();
    } catch (e) {
      setAnalyzing(false);
      setError(
        (e as { message?: string })?.message ||
          'Could not start analysis. Is the SOP ingested and the worker running?',
      );
    }
  }, [workbenchId, yamlText, fileName, onResult, stopPolling]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setYamlText(String(reader.result || ''));
      reset();
    };
    reader.readAsText(file);
  }, [reset]);

  const apply = useCallback(async () => {
    if (!result) return;
    const accepted = actionable.filter((f) => selected[findingKey(f)]);
    if (accepted.length === 0) {
      setError('Select at least one rule to apply.');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const res = await workflowsApi.reconcileApply(
        workbenchId,
        accepted,
        result.reconcile_id,
        fileName,
      );
      setApplied({ version: res.version, count: res.applied.length });
      onApplied(res.version);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to apply changes.');
    } finally {
      setApplying(false);
    }
  }, [result, actionable, selected, workbenchId, fileName, onApplied]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <GitCompare className="h-4 w-4 text-primary" />
              Compare SOP with YAML
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={sopTitle}>
              {sopTitle}
              {currentVersion != null && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono">
                  v{currentVersion}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {applied ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">
                  Applied {applied.count} rule {applied.count === 1 ? 'change' : 'changes'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  SOP is now{' '}
                  <span className="font-mono font-semibold text-foreground">v{applied.version}</span>
                  . Every change was logged for audit.
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={reset}>
                  Compare again
                </Button>
                <Button size="sm" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : !result ? (
            // ── Input stage ──
            <div className="space-y-3">
              <p className="text-[11px] leading-snug text-muted-foreground">
                Upload or paste an updated SOP YAML (rules, out-of-scope, etc.).
                AI compares each YAML rule with the rule stored in the database
                and recommends whether it <strong>augments</strong> (richer
                context) or <strong>contradicts</strong> the current rule. You
                choose which changes to apply — accepted changes update the rule,
                bump the SOP version, and are logged.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".yaml,.yml,.txt"
                  className="hidden"
                  onChange={onFile}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="h-8"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload YAML
                </Button>
                {fileName !== 'pasted' && (
                  <span className="truncate text-[11px] text-muted-foreground" title={fileName}>
                    {fileName}
                  </span>
                )}
              </div>
              <textarea
                value={yamlText}
                onChange={(e) => {
                  setYamlText(e.target.value);
                  setFileName('pasted');
                }}
                rows={14}
                spellCheck={false}
                placeholder={'sop_metadata:\n  document_title: ...\nsop_rules:\n  - rule_id: RULE-001\n    ...'}
                disabled={analyzing}
                className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] leading-snug outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              {analyzing && (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      {progress
                        ? `Comparing rules with AI… ${progress.processed}/${progress.total}`
                        : 'Queued — starting comparison in the worker…'}
                    </span>
                    {progress && progress.total > 0 && (
                      <span className="font-mono tabular-nums">
                        {Math.round((progress.processed / progress.total) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width:
                          progress && progress.total > 0
                            ? `${Math.min(100, (progress.processed / progress.total) * 100)}%`
                            : '8%',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Runs in the background — the server stays responsive. You can
                    keep this open; results appear here when done.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // ── Review stage ──
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['CONTRADICT', 'AUGMENT', 'NEW', 'IDENTICAL', 'MISSING'] as ReconcileVerdict[]).map(
                  (v) =>
                    (result.counts[v] ?? 0) > 0 && (
                      <span
                        key={v}
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                          VERDICT_META[v].tone,
                        )}
                      >
                        {result.counts[v]} {VERDICT_META[v].label}
                      </span>
                    ),
                )}
              </div>

              {actionable.length > 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {selectedCount} of {actionable.length} selected
                  </p>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        actionable.forEach((f) => (all[findingKey(f)] = true));
                        setSelected(all);
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:underline"
                      onClick={() => setSelected({})}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No augmentations or contradictions found — the YAML matches the
                  current rules.
                </p>
              )}

              <ul className="space-y-2">
                {actionable.map((f) => {
                  const k = findingKey(f);
                  const meta = VERDICT_META[f.verdict];
                  const Icon = meta.icon;
                  const isOpen = expanded[k];
                  return (
                    <li key={k} className="rounded-md border border-border">
                      <div className="flex items-start gap-2 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[k])}
                          onChange={(e) =>
                            setSelected((s) => ({ ...s, [k]: e.target.checked }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                meta.tone,
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {f.rule_key ?? `step ${f.step_number ?? '?'} · ${f.subrule_id}`}
                            </span>
                            {f.subrule_id && (
                              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                                {f.subrule_id}
                              </span>
                            )}
                            {f.yaml_subrule_id && f.yaml_subrule_id !== f.subrule_id && (
                              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                                ↔ yaml {f.yaml_subrule_id}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-snug text-foreground/90">
                            {f.reason}
                          </p>
                          {f.fields_changed.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpanded((x) => ({ ...x, [k]: !x[k] }))}
                              className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                            >
                              <ChevronRight
                                className={cn(
                                  'h-3 w-3 transition-transform',
                                  isOpen && 'rotate-90',
                                )}
                              />
                              {isOpen ? 'Hide' : 'Show'} {f.fields_changed.length} field
                              {f.fields_changed.length === 1 ? '' : 's'}
                            </button>
                          )}
                        </div>
                      </div>
                      {isOpen && f.fields_changed.length > 0 && (
                        <div className="space-y-2 border-t border-border px-2 py-2">
                          {f.fields_changed.map((field) => (
                            <div key={field} className="text-[10px]">
                              <p className="mb-0.5 font-medium text-muted-foreground">
                                {FIELD_LABELS[field] ?? field}
                              </p>
                              {f.verdict !== 'NEW' && (
                                <div className="rounded border border-red-200 bg-red-50/60 px-1.5 py-1 font-mono text-red-700 line-through decoration-red-400/60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300/80">
                                  {fieldValue(f.current, field) || <em>(empty)</em>}
                                </div>
                              )}
                              <div className="mt-0.5 rounded border border-emerald-200 bg-emerald-50/60 px-1.5 py-1 font-mono text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                {fieldValue(f.proposed, field) ||
                                  fieldValue(f.incoming, field) || <em>(empty)</em>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {unchanged.length > 0 && (
                <div className="rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setShowUnchanged((v) => !v)}
                    className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight
                      className={cn('h-3 w-3 transition-transform', showUnchanged && 'rotate-90')}
                    />
                    {unchanged.length} unchanged / informational
                  </button>
                  {showUnchanged && (
                    <ul className="space-y-1 border-t border-border px-2 py-1.5">
                      {unchanged.map((f) => (
                        <li
                          key={findingKey(f)}
                          className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                        >
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded border px-1 py-0.5 font-medium',
                              VERDICT_META[f.verdict].tone,
                            )}
                          >
                            {VERDICT_META[f.verdict].label}
                          </span>
                          <span className="font-mono">
                            {f.rule_key ?? f.subrule_id}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        {!applied && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8">
              Cancel
            </Button>
            {!result ? (
              <Button size="sm" onClick={() => void analyze()} disabled={analyzing} className="h-8">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Comparing…
                  </>
                ) : (
                  'Compare with AI'
                )}
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={reset} className="h-8">
                  Re-upload
                </Button>
                <Button
                  size="sm"
                  onClick={() => void apply()}
                  disabled={applying || selectedCount === 0}
                  className="h-8"
                >
                  {applying ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    `Apply ${selectedCount || ''} ${selectedCount === 1 ? 'change' : 'changes'}`.trim()
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
