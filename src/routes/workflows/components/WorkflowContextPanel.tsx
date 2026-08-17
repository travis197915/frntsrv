import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  Globe,
  Plus,
  Layers,
  Network,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Split,
  ArrowDownUp,
  Clock,
  GitCompare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  workflowsApi,
  type ExecutionMode,
  type RuntimeAgentInput,
  type SopColumn,
  type WorkflowAgent,
  type WorkflowSop,
} from '@/lib/workflowsApi';
import SopGraphDialog from './SopGraphDialog';
import SopVersionPreviewPanel from './SopVersionPreviewPanel';
import AddSopsDialog from './AddSopsDialog';
import SopReconcileDialog from './SopReconcileDialog';
import SopReviewActions from './SopReviewActions';
import SopVersionBadges from './SopVersionBadges';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/utils/utils';

type SopTab = 'queued' | 'completed' | 'failed';

interface WorkflowContextPanelProps {
  workflowId: string;
  workflowName: string;
  workflowDescription: string;
  sops: WorkflowSop[];
  agents: WorkflowAgent[];
  /** True when the workflow canvas was auto-built from its SOPs. */
  autoBuilt?: boolean;
  onAttached: () => void;
  canWrite?: boolean;
  /** Fired right after a SOP ingestion is dispatched so the parent can switch
   *  to the live build-progress (SSE) screen. */
  onIngestStarted?: () => void;
  /** Force a full canvas reload (e.g. after reordering SOP columns, whose new
   *  positions must be re-pulled from the server). */
  onCanvasReload?: () => void;
  /** When set, the SOP Execution panel auto-expands that workbench's context
   *  editor (e.g. after clicking its lane on the canvas). */
  focusWorkbenchId?: string | null;
}

const STATUS_STYLES: Record<string, { label: string; icon: typeof Clock; tone: string }> = {
  QUEUED:    { label: 'Queued',    icon: Clock,         tone: 'text-amber-500 bg-amber-50 border-amber-200' },
  RUNNING:   { label: 'Running',   icon: Loader2,       tone: 'text-blue-600 bg-blue-50 border-blue-200' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2,  tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  PARTIAL:   { label: 'Partial',   icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 border-amber-200' },
  FAILED:    { label: 'Failed',    icon: AlertTriangle, tone: 'text-red-600 bg-red-50 border-red-200' },
};

function groupSopsByStatus(sops: WorkflowSop[]) {
  const queued: WorkflowSop[] = [];
  const completed: WorkflowSop[] = [];
  const failed: WorkflowSop[] = [];

  for (const sop of sops) {
    if (sop.status === 'FAILED') {
      failed.push(sop);
    } else if (sop.status === 'COMPLETED' || sop.status === 'PARTIAL') {
      completed.push(sop);
    } else {
      queued.push(sop);
    }
  }

  return { queued, completed, failed };
}

const SOP_TABS: { key: SopTab; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'queued', label: 'Queued' },
  { key: 'failed', label: 'Failed' },
];

function sopTabButtonClass(active: boolean) {
  return cn(
    'relative flex-1 px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1 text-[11px] transition-all min-w-0',
    active
      ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 z-10 dark:bg-zinc-600 dark:text-zinc-50 dark:ring-white/10'
      : 'text-muted-foreground hover:text-foreground',
  );
}

function sopTabCountClass(active: boolean) {
  return cn(
    'text-[10px] tabular-nums',
    active ? 'text-muted-foreground' : 'text-muted-foreground/70',
  );
}

const STATUS_DOTS: Record<string, string> = {
  COMPLETED: 'bg-emerald-500',
  PARTIAL:   'bg-amber-500',
  FAILED:    'bg-red-500',
  RUNNING:   'bg-blue-500 animate-pulse',
  QUEUED:    'bg-amber-400 animate-pulse',
};

function StatusDot({ status }: { status: string }) {
  const meta = STATUS_STYLES[status] ?? STATUS_STYLES.QUEUED;
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STATUS_DOTS[status] ?? 'bg-muted-foreground')}
      title={meta.label}
    />
  );
}

function SopListItem({
  sop,
  canWrite,
  onOpenGraph,
  onReviewComplete,
  onViewVersion,
}: {
  sop: WorkflowSop;
  canWrite: boolean;
  onOpenGraph: (sop: WorkflowSop) => void;
  onReviewComplete: () => void;
  onViewVersion: (sop: WorkflowSop) => void;
}) {
  const canOpenGraph = sop.status === 'COMPLETED' || sop.status === 'PARTIAL';

  return (
    <li className="text-xs rounded-md border border-border bg-background px-2.5 py-2">
      <button
        type="button"
        onClick={() => canOpenGraph && onOpenGraph(sop)}
        disabled={!canOpenGraph}
        className={cn(
          'group w-full text-left transition-colors',
          canOpenGraph
            ? 'hover:text-primary cursor-pointer'
            : 'opacity-70 cursor-not-allowed',
        )}
      >
        <div className="flex items-center gap-2">
          <StatusDot status={sop.status} />
          <p className="font-medium text-foreground truncate flex-1 min-w-0">
            {shortenUrl(sop.seed_url)}
          </p>
          {canOpenGraph && (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-4">
          {canOpenGraph ? (
            <span className="inline-flex items-center gap-1 group-hover:text-primary transition-colors">
              <Network className="h-2.5 w-2.5" />
              View SOP Graph
            </span>
          ) : (
            <>
              {sop.docs_processed} doc{sop.docs_processed === 1 ? '' : 's'} parsed
              {sop.docs_failed > 0 && ` · ${sop.docs_failed} failed`}
            </>
          )}
        </p>
      </button>
      <SopVersionBadges version={sop.sop_version} className="mt-1.5 ml-4" />
      {canOpenGraph && sop.audit_sop_id != null && (
        <button
          type="button"
          onClick={() => onViewVersion(sop)}
          className={cn(
            'mt-1.5 ml-4 inline-flex items-center gap-1 text-[10px] font-medium transition-colors',
            sop.sop_version?.change_set
              ? 'text-amber-700 hover:text-amber-900 dark:text-amber-400'
              : 'text-muted-foreground hover:text-primary',
          )}
        >
          <Layers className="h-2.5 w-2.5" />
          {sop.sop_version?.change_set
            ? `Review ${sop.sop_version.change_set.proposal_count} rule changes`
            : 'View this version'}
        </button>
      )}
      <SopReviewActions
        sopId={sop.audit_sop_id}
        version={sop.sop_version}
        canReview={canWrite}
        ingestionStatus={sop.status}
        onComplete={onReviewComplete}
        className="mt-1.5 ml-4"
      />
    </li>
  );
}

export default function WorkflowContextPanel({
  workflowId,
  workflowName,
  workflowDescription,
  sops,
  agents,
  autoBuilt = false,
  onAttached,
  canWrite = false,
  onIngestStarted,
  onCanvasReload,
  focusWorkbenchId,
}: WorkflowContextPanelProps) {
  const [adding, setAdding] = useState<'sop' | 'agent' | null>(null);
  const [graphSop, setGraphSop] = useState<WorkflowSop | null>(null);
  const [versionSop, setVersionSop] = useState<WorkflowSop | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // `?review=<sop_id>` arrives from the notification bell. Derived rather than
  // pushed into state by an effect, so landing on the URL opens the panel on
  // the first render instead of after a second pass.
  const reviewParam = searchParams.get('review');
  const requestedVersionSop = reviewParam
    ? (sops.find((s) => String(s.audit_sop_id) === reviewParam) ?? null)
    : null;
  const activeVersionSop = versionSop ?? requestedVersionSop;

  const closeVersionPanel = useCallback(() => {
    setVersionSop(null);
    if (searchParams.has('review')) {
      const next = new URLSearchParams(searchParams);
      next.delete('review');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [newAgent, setNewAgent] = useState<RuntimeAgentInput>({
    name: '', url: '', method: 'GET', auth_type: 'none', auth_token: '',
  });
  const [busy, setBusy] = useState(false);
  const [sopTab, setSopTab] = useState<SopTab>('completed');
  const groupedSops = groupSopsByStatus(sops);
  const activeSops = groupedSops[sopTab];

  const hasPending = sops.some((s) => s.status === 'QUEUED' || s.status === 'RUNNING');

  // Poll the workflow while any ingestion is still in flight.
  useEffect(() => {
    if (!hasPending || !workflowId) return;
    const t = setInterval(() => onAttached(), 4000);
    return () => clearInterval(t);
  }, [hasPending, workflowId, onAttached]);

  const attachSops = useCallback(async (urls: string[], autoBuild: boolean) => {
    if (!urls.length) return;
    setBusy(true);
    try {
      await workflowsApi.attach(workflowId, { sopUrls: urls, autoBuildFromSop: autoBuild });
      setAdding(null);
      onAttached();
      // Jump to the live progress (SSE) screen while the new SOP ingests.
      onIngestStarted?.();
    } finally {
      setBusy(false);
    }
  }, [workflowId, onAttached, onIngestStarted]);

  const attachAgent = useCallback(async () => {
    if (!newAgent.name.trim() || !newAgent.url.trim()) return;
    setBusy(true);
    try {
      await workflowsApi.attach(workflowId, { runtimeAgents: [newAgent] });
      setNewAgent({ name: '', url: '', method: 'GET', auth_type: 'none', auth_token: '' });
      setAdding(null);
      onAttached();
    } finally {
      setBusy(false);
    }
  }, [newAgent, workflowId, onAttached]);

  return (
    <aside className="w-full h-full border-l border-border bg-card overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold">{workflowName || 'Workflow'}</h2>
        {workflowDescription && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {workflowDescription}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">
          Workflow Context
        </p>
      </div>

      {/* ── SOP Documents ──────────────────────────────────────────────── */}
      <section className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              SOPs <span className="text-foreground">({sops.length})</span>
            </h3>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setAdding(adding === 'sop' ? null : 'sop')}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {sops.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No SOPs attached.</p>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="SOP status"
              className="mb-3 flex rounded-lg bg-muted p-1 gap-0.5 dark:bg-zinc-900/80"
            >
              {SOP_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={sopTab === key}
                  onClick={() => setSopTab(key)}
                  className={sopTabButtonClass(sopTab === key)}
                >
                  {label}{' '}
                  <span className={sopTabCountClass(sopTab === key)}>
                    ({groupedSops[key].length})
                  </span>
                </button>
              ))}
            </div>

            {activeSops.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No {sopTab} SOPs.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeSops.map((sop) => (
                  <SopListItem
                    key={sop.job_id}
                    sop={sop}
                    canWrite={canWrite}
                    onOpenGraph={setGraphSop}
                    onReviewComplete={onAttached}
                    onViewVersion={setVersionSop}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ── SOP execution (linear/parallel + run order) ────────────────── */}
      <SopExecutionSection
        workflowId={workflowId}
        sopCount={sops.length}
        onReordered={onCanvasReload ?? onAttached}
        focusWorkbenchId={focusWorkbenchId}
      />

      {/* ── Runtime Agents ─────────────────────────────────────────────── */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Runtime Agents <span className="text-foreground">({agents.length})</span>
            </h3>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setAdding(adding === 'agent' ? null : 'agent')}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {adding === 'agent' && (
          <div className="mb-3 space-y-2 p-2 rounded-md border border-border bg-muted/30">
            <Input
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="Agent name"
              className="text-xs h-8"
              autoFocus
            />
            <div className="flex gap-1.5">
              <select
                value={newAgent.method}
                onChange={(e) => setNewAgent({ ...newAgent, method: e.target.value as RuntimeAgentInput['method'] })}
                className="text-[11px] h-8 px-1.5 rounded-md border border-input bg-background"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <Input
                value={newAgent.url}
                onChange={(e) => setNewAgent({ ...newAgent, url: e.target.value })}
                placeholder="https://api.example.com/…"
                className="text-xs h-8 flex-1"
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={newAgent.auth_type}
                onChange={(e) => setNewAgent({ ...newAgent, auth_type: e.target.value as RuntimeAgentInput['auth_type'] })}
                className="text-[11px] h-8 px-1.5 rounded-md border border-input bg-background"
              >
                <option value="none">No auth</option>
                <option value="bearer">Bearer</option>
                <option value="api_key">API Key</option>
                <option value="basic">Basic</option>
              </select>
              {newAgent.auth_type !== 'none' && (
                <Input
                  type="password"
                  value={newAgent.auth_token ?? ''}
                  onChange={(e) => setNewAgent({ ...newAgent, auth_token: e.target.value })}
                  placeholder="token"
                  className="text-xs h-8 flex-1"
                />
              )}
            </div>
            <Button size="sm" onClick={attachAgent} disabled={busy} className="w-full">
              Register Agent
            </Button>
          </div>
        )}

        {agents.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No runtime agents.</p>
        ) : (
          <ul className="space-y-2">
            {agents.map((agent, i) => (
              <li
                key={agent.endpoint_id || `${agent.name}-${i}`}
                className="text-xs rounded-md border border-border bg-background p-2"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {agent.method}
                  </span>
                  <span className="font-medium truncate flex-1">{agent.name || '(unnamed)'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate font-mono">
                  {agent.url}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  auth: <span className="font-medium">{agent.auth_type}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeVersionSop?.audit_sop_id != null && (
        <SopVersionPreviewPanel
          workflowId={workflowId}
          sopId={activeVersionSop.audit_sop_id}
          versionLabel={`v${activeVersionSop.sop_version?.version_number ?? '?'} · ${shortenUrl(activeVersionSop.seed_url)}`}
          onClose={closeVersionPanel}
          onReviewed={onAttached}
        />
      )}

      <SopGraphDialog
        open={!!graphSop}
        jobId={graphSop?.job_id ?? ''}
        auditSopId={graphSop?.audit_sop_id ?? null}
        onClose={() => setGraphSop(null)}
      />

      <AddSopsDialog
        open={adding === 'sop'}
        busy={busy}
        defaultAutoBuild={autoBuilt}
        onOpenChange={(open) => setAdding(open ? 'sop' : null)}
        onAdd={(urls, autoBuild) => void attachSops(urls, autoBuild)}
      />
    </aside>
  );
}

function SopExecutionSection({
  workflowId,
  sopCount,
  onReordered,
  focusWorkbenchId,
}: {
  workflowId: string;
  sopCount: number;
  onReordered: () => void;
  focusWorkbenchId?: string | null;
}) {
  const [columns, setColumns] = useState<SopColumn[] | null>(null);
  const [mode, setMode] = useState<ExecutionMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const flashSaved = useCallback((msg: string) => {
    setSavedMsg(msg);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedMsg(null), 2500);
  }, []);

  const load = useCallback(() => {
    if (!workflowId) return;
    workflowsApi
      .sopColumns(workflowId)
      .then(setColumns)
      .catch(() => setColumns([]));
    workflowsApi
      .executionMode(workflowId)
      .then((r) => setMode(r.mode))
      .catch(() => setMode('linear'));
  }, [workflowId]);

  // (Re)load whenever the SOP set changes (e.g. after a new build).
  useEffect(() => {
    load();
  }, [load, sopCount]);

  const changeMode = useCallback(
    async (next: ExecutionMode) => {
      if (busy || next === mode) return;
      setMode(next); // optimistic
      setBusy(true);
      setError(null);
      try {
        const res = await workflowsApi.setExecutionMode(workflowId, next);
        setMode(res.mode);
        onReordered(); // canvas topology changed (Fork/Verdict nodes) — reload
        load(); // refresh column positions
        flashSaved(
          next === 'parallel'
            ? 'Switched to parallel execution'
            : 'Switched to linear execution',
        );
      } catch {
        setError('Failed to change execution mode. Please try again.');
        load();
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, workflowId, onReordered, load, flashSaved],
  );

  const move = useCallback(
    async (index: number, dir: -1 | 1) => {
      if (!columns) return;
      const target = index + dir;
      if (target < 0 || target >= columns.length) return;
      const next = [...columns];
      [next[index], next[target]] = [next[target], next[index]];
      setColumns(next); // optimistic
      setBusy(true);
      setError(null);
      try {
        // Auto-save: persist the new order immediately on every move.
        const result = await workflowsApi.reorderSops(
          workflowId,
          next.map((c) => c.workbench_id),
        );
        setColumns(result);
        onReordered(); // refresh the canvas to reflect the new column order
        flashSaved('SOP run order saved');
      } catch {
        setError('Failed to reorder. Please try again.');
        load(); // revert to server truth
      } finally {
        setBusy(false);
      }
    },
    [columns, workflowId, onReordered, load, flashSaved],
  );

  // Need at least one SOP to show the section. The Linear/Parallel mode toggle
  // and reorder controls only matter with 2+ columns; the per-SOP context
  // editor is available for every SOP (including a single one).
  if (!columns || columns.length < 1) return null;
  const multi = columns.length >= 2;

  return (
    <section className="p-4 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <Split className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          SOP Execution
        </h3>
        {busy && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Linear / Parallel mode toggle (only meaningful with 2+ SOPs) */}
      {multi && (
        <div
          role="tablist"
          aria-label="Execution mode"
          className="mb-2 flex rounded-lg bg-muted p-1 gap-0.5 dark:bg-zinc-900/80"
        >
          {(
            [
              { key: 'linear' as const, label: 'Linear', icon: ArrowDownUp },
              { key: 'parallel' as const, label: 'Parallel', icon: Split },
            ]
          ).map(({ key, label, icon: Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={busy}
                onClick={() => void changeMode(key)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1.5 text-[11px] transition-all disabled:opacity-60',
                  active
                    ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-zinc-600 dark:text-zinc-50 dark:ring-white/10'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {multi &&
        (mode === 'parallel' ? (
          <p className="text-[10px] text-muted-foreground leading-snug">
            All {columns.length} SOPs run independently from a{' '}
            <span className="font-medium text-foreground">Parallel Split</span>{' '}
            node. Each one is fused at the{' '}
            <span className="font-medium text-foreground">Verdict</span> node —
            the most severe disposition wins (a SOP defect no longer skips the
            others).
          </p>
        ) : (
          <div className="flex items-center gap-1.5">
            <ListOrdered className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground leading-snug">
              SOPs run top-to-bottom in this order; the first defect stops the
              rest. Reorder below — saved automatically.
            </p>
          </div>
        ))}

      {/* Per-SOP list: reorder controls (linear + 2+ SOPs) and a context editor
          for every SOP. Click the document icon to add YAML/text guidance that
          the engine injects into that SOP's rule evaluations at runtime. */}
      <ol className="mt-2 space-y-1.5">
        {columns.map((col, i) => (
          <SopContextRow
            key={col.workbench_id}
            col={col}
            index={i}
            total={columns.length}
            busy={busy}
            canReorder={multi && mode !== 'parallel'}
            onMove={move}
            defaultOpen={focusWorkbenchId === col.workbench_id}
            onSaved={(msg) => {
              flashSaved(msg);
              load();
            }}
          />
        ))}
      </ol>

      {error && <p className="mt-2 text-[10px] text-red-500">{error}</p>}

      {savedMsg && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-lg dark:bg-emerald-950/90 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4" />
          {savedMsg}
        </div>
      )}
    </section>
  );
}

/** One SOP row in the SOP Execution list: reorder controls (when enabled) and
 *  an expandable editor for the SOP's extra context. The context is injected
 *  verbatim into that SOP's rule-evaluation prompts at execution time. */
function SopContextRow({
  col,
  index,
  total,
  busy,
  canReorder,
  defaultOpen,
  onMove,
  onSaved,
}: {
  col: SopColumn;
  index: number;
  total: number;
  busy: boolean;
  canReorder: boolean;
  defaultOpen?: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onSaved: (msg: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(Boolean(defaultOpen));
  const [draft, setDraft] = useState<string>(col.extra_context || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  // Sync the draft with server truth when it changes and the user has no
  // unsaved edits open (e.g. after a reload following a save elsewhere).
  useEffect(() => {
    if (!open) setDraft(col.extra_context || '');
  }, [col.extra_context, open]);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  // Lazily pull the SOP version so the badge reflects the latest reconcile.
  useEffect(() => {
    let alive = true;
    if (col.sop_id == null) return;
    workflowsApi
      .sopVersion(col.workbench_id)
      .then((r) => alive && setVersion(r.version))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [col.workbench_id, col.sop_id]);

  const hasContext = Boolean((col.extra_context || '').trim());
  const dirty = (draft || '').trim() !== (col.extra_context || '').trim();

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await workflowsApi.setWorkbenchContext(col.workbench_id, draft);
      onSaved('SOP context saved');
    } catch {
      setSaveError('Failed to save context. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [col.workbench_id, draft, onSaved]);

  return (
    <li className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="w-4 text-center text-[10px] font-mono tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <span
          className="flex-1 min-w-0 truncate text-xs"
          title={prettifySopName(col)}
        >
          {prettifySopName(col)}
        </span>
        <span
          className="text-[10px] text-muted-foreground tabular-nums"
          title={`${col.shape_count} steps`}
        >
          {col.shape_count}
        </span>
        {version != null && (
          <span
            className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
            title="SOP rule version"
          >
            v{version}
          </span>
        )}
        {col.version != null && (
          <span
            className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
            title="Canvas version — bumps when this SOP's content changes and a new column is appended in its place (older versions are preserved, not shown here)"
          >
            Canvas v{col.version}
          </span>
        )}
        {col.sop_id != null && (
          <button
            type="button"
            onClick={() => setReconcileOpen(true)}
            title="Compare this SOP with a YAML and reconcile rules"
            className="inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
          >
            <GitCompare className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={hasContext ? 'Edit SOP context' : 'Add SOP context'}
          className={cn(
            'inline-flex items-center transition-colors',
            hasContext
              ? 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
        {canReorder && (
          <div className="flex flex-col">
            <button
              type="button"
              disabled={busy || index === 0}
              onClick={() => void onMove(index, -1)}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={busy || index === total - 1}
              onClick={() => void onMove(index, 1)}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-border px-2 py-2">
          <label className="mb-1 block text-[10px] text-muted-foreground leading-snug">
            Extra context for this SOP — paste YAML or notes. Injected verbatim
            into every rule evaluation for this SOP at runtime so the engine
            decides the correct verdict.
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={'# e.g. domain guidance, edge cases, code lists…'}
            className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] leading-snug outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {hasContext
                ? `${(col.extra_context || '').length} chars saved`
                : 'No context yet'}
            </span>
            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={() => setDraft(col.extra_context || '')}
                  disabled={saving}
                  className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Reset
                </button>
              )}
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={saving || !dirty}
                className="h-7 px-2.5 text-[11px]"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Save context'
                )}
              </Button>
            </div>
          </div>
          {saveError && (
            <p className="mt-1 text-[10px] text-red-500">{saveError}</p>
          )}
        </div>
      )}

      <SopReconcileDialog
        open={reconcileOpen}
        workbenchId={col.workbench_id}
        sopTitle={prettifySopName(col)}
        currentVersion={version}
        onClose={() => setReconcileOpen(false)}
        onApplied={(newVersion) => {
          setVersion(newVersion);
          onSaved(`SOP rules updated — now v${newVersion}`);
        }}
      />
    </li>
  );
}

/** Human-readable SOP label: strips the upload-hash prefix, order number,
 *  file extension, and the `· file://…` source-ref tail that workbench names
 *  carry, then turns underscores into spaces. */
function prettifySopName(col: SopColumn): string {
  let s = (col.sop_title || col.name || '').split('  ·  ')[0];
  s = s
    .replace(/^\s*\d+\.\s*/, '')           // leading "N. " order prefix
    .replace(/^[0-9a-f]{32}_/i, '')        // upload-hash prefix
    .replace(/\.(pdf|docx?|xlsx?|html?|txt)$/i, '') // file extension
    .replace(/_/g, ' ')
    .trim();
  return s || col.name || col.workbench_id;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 36 ? u.pathname.slice(0, 33) + '…' : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url;
  }
}
