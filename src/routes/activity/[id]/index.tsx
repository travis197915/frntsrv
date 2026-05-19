import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import {
  ArrowLeft,
  Clock,
  User,
  GitBranch,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  Timer,
  ExternalLink,
  ScrollText,
  Trophy,
  Bot,
  Copy,
  Check,
  Link2,
  ChevronUp,
  Database,
} from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import { cn } from '@/lib/utils';
import {
  GET_TRANSACTION_QUERY,
  GET_RUN_STEP_DETAIL_QUERY,
  GET_RUN_AGENT_LOGS_QUERY,
  GET_RUN_RESULT_QUERY,
} from '@/graphql/transaction.graphql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function isUrl(val: unknown): val is string {
  return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
}

type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';
type StepStatus = RunStatus | 'awaiting_input' | 'superseded' | 'skipped' | 'pending';

function normaliseRunStatus(raw: string): RunStatus {
  const s = raw.toLowerCase();
  if (s === 'running' || s === 'pending' || s === 'paused') return 'running';
  if (s === 'completed' || s === 'success')                  return 'completed';
  if (s === 'failed'   || s === 'failure')                   return 'failed';
  return 'cancelled';
}

function normaliseStepStatus(raw: string, runIsCompleted: boolean): StepStatus {
  const s = raw.toLowerCase();
  if (s === 'completed' || s === 'success')   return 'completed';
  if (s === 'failed'    || s === 'failure')   return 'failed';
  if (s === 'awaiting_input') {
    // If the overall run finished, this was a retry-superseded intermediate attempt
    return runIsCompleted ? 'superseded' : 'awaiting_input';
  }
  if (s === 'running' || s === 'pending' || s === 'paused') return 'running';
  return 'pending';
}

// ── Status meta ───────────────────────────────────────────────────────────────

const RUN_STATUS_META: Record<RunStatus, { label: string; badge: string; line: string; dot: string; bar: string }> = {
  running:   { label: 'Running',   badge: 'bg-blue-100 text-blue-700',             line: 'bg-blue-400',    dot: 'bg-blue-500 animate-pulse',  bar: 'bg-blue-400' },
  completed: { label: 'Completed', badge: 'bg-emerald-100 text-emerald-700',       line: 'bg-emerald-400', dot: 'bg-emerald-500',             bar: 'bg-emerald-400' },
  failed:    { label: 'Failed',    badge: 'bg-red-100 text-red-700',               line: 'bg-red-400',     dot: 'bg-red-500',                 bar: 'bg-red-400' },
  cancelled: { label: 'Cancelled', badge: 'bg-slate-100 text-slate-600',           line: 'bg-slate-300',   dot: 'bg-slate-400',               bar: 'bg-slate-300' },
};

const NODE_STATUS_CONFIG: Record<string, { icon: React.ReactNode; dot: string; label: string; accent?: string; labelColor: string }> = {
  completed: {
    icon:       <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    dot:        'bg-emerald-500 ring-emerald-200',
    label:      'Completed',
    labelColor: 'text-emerald-600',
  },
  failed: {
    icon:       <XCircle className="h-3.5 w-3.5 text-red-500" />,
    dot:        'bg-red-500 ring-red-200',
    label:      'Failed',
    accent:     'border-l-[3px] border-l-red-400',
    labelColor: 'text-red-500',
  },
  running: {
    icon:       <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
    dot:        'bg-blue-500 ring-blue-200 animate-pulse',
    label:      'Running',
    labelColor: 'text-blue-600',
  },
  awaiting_input: {
    icon:       <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />,
    dot:        'bg-amber-400 ring-amber-200 animate-pulse',
    label:      'Awaiting Input',
    labelColor: 'text-amber-600',
  },
  superseded: {
    icon:       <MinusCircle className="h-3.5 w-3.5 text-slate-400" />,
    dot:        'bg-slate-200 ring-slate-100',
    label:      'Superseded',
    labelColor: 'text-muted-foreground',
  },
  skipped: {
    icon:       <MinusCircle className="h-3.5 w-3.5 text-slate-400" />,
    dot:        'bg-slate-300 ring-slate-100',
    label:      'Skipped',
    labelColor: 'text-muted-foreground',
  },
  pending: {
    icon:       <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />,
    dot:        'bg-slate-200 ring-slate-100',
    label:      'Pending',
    labelColor: 'text-muted-foreground',
  },
};

const NODE_TYPE_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  trigger:           { label: 'Trigger',       dot: 'bg-violet-400', bg: 'bg-violet-50 text-violet-600 border border-violet-200' },
  agent_combo:       { label: 'Agent Combo',   dot: 'bg-blue-400',   bg: 'bg-blue-50 text-blue-600 border border-blue-200' },
  claim_preflight:   { label: 'Pre-flight',    dot: 'bg-amber-400',  bg: 'bg-amber-50 text-amber-600 border border-amber-200' },
  condition:         { label: 'Condition',     dot: 'bg-amber-400',  bg: 'bg-amber-50 text-amber-600 border border-amber-200' },
  output:            { label: 'Output',        dot: 'bg-emerald-400',bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  python_script:     { label: 'Script',        dot: 'bg-slate-400',  bg: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

// ── Map a task to a StepNode ──────────────────────────────────────────────────

interface StepNode {
  id: string;
  label: string;
  type: string;
  status: StepStatus;
  durationMs?: number;
  error?: string | null;
}

function mapTaskToNode(task: any, runIsCompleted: boolean): StepNode {
  let durationMs: number | undefined;
  if (task.startedAt && task.finishedAt) {
    durationMs = new Date(task.finishedAt).getTime() - new Date(task.startedAt).getTime();
  }
  const rawLabel =
    task.agent?.name ??
    task.agentName ??
    task.pipelineName ??
    null;

  return {
    id:        String(task.id),
    label:     rawLabel ?? `Step ${task.id}`,
    type:      (task.executorType ?? task.agent?.type ?? 'agent_combo').toLowerCase(),
    status:    normaliseStepStatus(task.status, runIsCompleted),
    durationMs,
    error:     task.error ?? null,
  };
}

// ── URL value with copy-to-clipboard ─────────────────────────────────────────

function UrlValue({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Derive a readable short label: last segment of path
  const short = (() => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] ?? url;
    } catch {
      return url.length > 52 ? `${url.slice(0, 52)}…` : url;
    }
  })();

  return (
    <div className="flex items-center gap-1.5 group min-w-0">
      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-xs text-primary truncate max-w-[280px]" title={url}>{short}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
        title="Copy URL"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

// ── DataValue ─────────────────────────────────────────────────────────────────

function DataValue({ value }: { value: unknown }): React.ReactElement {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic text-xs">—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        value
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
      )}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (isUrl(value)) {
    return <UrlValue url={value} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic text-xs">empty list</span>;
    const hasObjects = value.some(item => item !== null && typeof item === 'object');
    if (hasObjects) {
      return (
        <div className="space-y-1 w-full">
          {value.map((item, i) => (
            <pre key={i} className="text-[11px] text-foreground bg-muted/50 rounded p-2 overflow-x-auto max-h-32 font-mono">
              {JSON.stringify(item, null, 2)}
            </pre>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <span key={i} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border">
            {isUrl(item) ? <UrlValue url={item} /> : String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <pre className="text-[11px] text-foreground bg-muted/50 rounded p-2 overflow-x-auto max-h-32 font-mono">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="text-sm text-foreground">{String(value)}</span>;
}

// ── DataBlock ─────────────────────────────────────────────────────────────────

function DataBlock({ label, data, defaultCollapsed = false }: {
  label: string;
  data: Record<string, unknown>;
  defaultCollapsed?: boolean;
}) {
  const publicEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
  const privateEntries = Object.entries(data).filter(([key]) => key.startsWith('_'));
  const [showPrivate, setShowPrivate] = useState(false);

  if (publicEntries.length === 0 && privateEntries.length === 0) return null;

  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-1.5 mb-2 group"
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
          : <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
        }
        <span className="text-[10px] text-muted-foreground">
          {publicEntries.length + (showPrivate ? privateEntries.length : 0)} keys
        </span>
      </button>

      {!collapsed && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border/60 overflow-hidden">
          {publicEntries.map(([key, val]) => (
            <div key={key} className="flex items-start gap-0 hover:bg-muted/30 transition-colors">
              <span className="text-[11px] w-36 shrink-0 px-3 py-2.5 font-mono font-medium text-foreground/80 bg-muted/40 border-r border-border/60 leading-relaxed break-all">
                {key}
              </span>
              <div className="flex-1 min-w-0 px-3 py-2.5">
                <DataValue value={val} />
              </div>
            </div>
          ))}

          {privateEntries.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowPrivate(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <span className="text-[10px] text-muted-foreground font-medium">
                  {showPrivate ? 'Hide' : 'Show'} {privateEntries.length} internal keys
                </span>
                {showPrivate
                  ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
                }
              </button>
              {showPrivate && privateEntries.map(([key, val]) => (
                <div key={key} className="flex items-start gap-0 hover:bg-muted/30 transition-colors">
                  <span className="text-[11px] w-36 shrink-0 px-3 py-2.5 font-mono font-medium text-violet-600 bg-violet-50/40 border-r border-border/60 leading-relaxed break-all">
                    {key}
                  </span>
                  <div className="flex-1 min-w-0 px-3 py-2.5">
                    <DataValue value={val} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── NodeCard ──────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  runId,
  stepIndex,
  isLast,
}: {
  node: StepNode;
  runId: string;
  stepIndex: number;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const statusCfg = NODE_STATUS_CONFIG[node.status] ?? NODE_STATUS_CONFIG.pending;
  const typeCfg   = NODE_TYPE_CONFIG[node.type]     ?? NODE_TYPE_CONFIG.python_script;

  const [fetchDetail, { data: detailData, loading: detailLoading }] = useLazyQuery(
    GET_RUN_STEP_DETAIL_QUERY,
  );

  const detail = (detailData as any)?.runStepDetail;

  let inputs:  Record<string, unknown> | null = null;
  let outputs: Record<string, unknown> | null = null;
  try { if (detail?.inputs)  inputs  = JSON.parse(detail.inputs);  } catch { /* */ }
  try { if (detail?.outputs) outputs = JSON.parse(detail.outputs); } catch { /* */ }

  const isExpandable = node.status === 'completed' || node.status === 'failed' || node.status === 'superseded' || !!node.error;

  function handleToggle() {
    if (!isExpandable) return;
    if (!open && !detail && !detailLoading) {
      fetchDetail({ variables: { runId, stepId: node.id } });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="flex gap-3">
      {/* Timeline track */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          'h-6 w-6 rounded-full ring-4 shrink-0 flex items-center justify-center mt-2',
          statusCfg.dot,
        )}>
          <span className="text-[9px] font-bold text-white leading-none">{stepIndex}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />}
      </div>

      {/* Card */}
      <div className={cn(
        'flex-1 rounded-xl border border-border bg-card mb-3 overflow-hidden transition-shadow hover:shadow-sm',
        statusCfg.accent,
      )}>
        <div
          className={cn(
            'flex items-center justify-between gap-2 px-4 py-3',
            isExpandable && 'cursor-pointer hover:bg-muted/30 transition-colors',
          )}
          onClick={handleToggle}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">{statusCfg.icon}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground leading-tight truncate">
                  {node.label}
                </span>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', typeCfg.bg)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', typeCfg.dot)} />
                  {typeCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <span className={cn('text-[11px] font-medium', statusCfg.labelColor)}>
                  {statusCfg.label}
                </span>
                {node.durationMs !== undefined && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    {formatDuration(node.durationMs)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isExpandable && (
            <div className="shrink-0 text-muted-foreground">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          )}
        </div>

        {open && (
          <div className="border-t border-border/60 px-4 py-3 space-y-4">
            {node.error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{node.error}</p>
              </div>
            )}
            {detailLoading && (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading step detail…</span>
              </div>
            )}
            {!detailLoading && detail && (
              <>
                {inputs  && <DataBlock label="Inputs"  data={inputs}  defaultCollapsed={true} />}
                {outputs && <DataBlock label="Outputs" data={outputs} defaultCollapsed={false} />}
                {!inputs && !outputs && (
                  <p className="text-xs text-muted-foreground italic">No snapshot data available for this step.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Final Outcome card ────────────────────────────────────────────────────────

const OUTCOME_HIGHLIGHT_KEYS = ['claim_id', 'service_line', 'form_id', 'exceptions_logged'];

function FinalOutcomeCard({ runId }: { runId: string }) {
  const { data, loading, error } = useQuery(GET_RUN_RESULT_QUERY, {
    variables: { runId },
    fetchPolicy: 'cache-first',
  });

  const result = (data as any)?.runResult;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span className="text-xs">Loading final outcome…</span>
      </div>
    );
  }

  if (error || !result) return null;

  let context: Record<string, unknown> = {};
  try { context = JSON.parse(result.context ?? '{}'); } catch { /* */ }

  const outcomeLabel: string | null = result.outcome ?? context['_outcome'] as string ?? null;

  // Highlight the most important keys at the top
  const highlights = OUTCOME_HIGHLIGHT_KEYS
    .filter(k => context[k] !== undefined && context[k] !== null && context[k] !== '')
    .map(k => ({ key: k, val: context[k] }));


  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm font-semibold text-foreground">Final Outcome</p>
        {outcomeLabel && (
          <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            {outcomeLabel}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Key highlights */}
        {highlights.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {highlights.map(({ key, val }) => (
              <div key={key} className="rounded-lg bg-muted/40 border border-border px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {String(val)}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Run Context section (full-width, placed in main column) ──────────────────

function RunContextSection({ runId }: { runId: string }) {
  const { data, loading } = useQuery(GET_RUN_RESULT_QUERY, {
    variables: { runId },
    fetchPolicy: 'cache-first',
  });

  const result = (data as any)?.runResult;
  if (loading || !result) return null;

  let context: Record<string, unknown> = {};
  try { context = JSON.parse(result.context ?? '{}'); } catch { /* */ }

  const allKeys = Object.fromEntries(Object.entries(context).filter(([k]) => !OUTCOME_HIGHLIGHT_KEYS.includes(k)));
  if (Object.keys(allKeys).length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Run Context
        </p>
      </div>
      <DataBlock label="All keys" data={allKeys} defaultCollapsed={false} />
    </div>
  );
}

// ── Agent Logs section ────────────────────────────────────────────────────────

function AgentLogsSection({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const [fetchLogs, { data, loading }] = useLazyQuery(GET_RUN_AGENT_LOGS_QUERY);
  const logs: any[] = (data as any)?.runAgentLogs ?? [];

  function handleToggle() {
    if (!open && !data && !loading) fetchLogs({ variables: { runId } });
    setOpen((v) => !v);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Agent Logs</span>
          {logs.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
              {logs.length}
            </span>
          )}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/60">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Fetching agent logs…</span>
            </div>
          )}
          {!loading && logs.length === 0 && (
            <p className="px-4 py-4 text-xs text-muted-foreground italic">No agent logs recorded for this run.</p>
          )}
          {!loading && logs.length > 0 && (
            <div className="divide-y divide-border/60">
              {logs.map((log) => {
                let parsed: Record<string, unknown> = {};
                try { parsed = JSON.parse(log.data ?? '{}'); } catch { /* */ }
                const entries = Object.entries(parsed);
                return (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 border border-violet-200">
                        {log.table}
                      </span>
                      {log.startedAt && (
                        <span className="text-[10px] text-muted-foreground">{formatDate(log.startedAt)}</span>
                      )}
                    </div>
                    {entries.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border/50 overflow-hidden">
                        {entries.map(([key, val]) => (
                          <div key={key} className="flex items-start gap-4 px-3 py-2">
                            <span className="text-[10px] text-muted-foreground font-mono w-32 shrink-0 pt-0.5">{key}</span>
                            <div className="flex-1 min-w-0"><DataValue value={val} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const { data, loading } = useQuery(GET_TRANSACTION_QUERY, {
    variables: { id: runId },
    skip: !runId,
    fetchPolicy: 'cache-and-network',
  });

  if (loading) {
    return (
      <SidebarLayout title="Activity" subtitle="">
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  const raw = (data as any)?.transaction;

  if (!raw) {
    return (
      <SidebarLayout title="Activity" subtitle="">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <XCircle className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Run not found</p>
          <p className="text-xs text-muted-foreground">The run ID "{runId}" doesn't exist.</p>
          <button type="button" onClick={() => navigate('/activity')} className="mt-2 text-xs text-primary hover:underline">
            Back to Activity
          </button>
        </div>
      </SidebarLayout>
    );
  }

  const status      = normaliseRunStatus(raw.status);
  const statusMeta  = RUN_STATUS_META[status];
  const workflowName = raw.workflow?.name ?? raw.pipelineName ?? 'Unknown Workflow';
  const workflowId   = raw.workflowId ?? raw.workflow?.id ?? null;
  const triggeredBy  = raw.triggeredBy ?? 'System';
  const tasks: any[] = raw.tasks ?? [];
  const nodes: StepNode[] = tasks.map((t) => mapTaskToNode(t, status === 'completed'));

  let durationMs: number | undefined;
  if (raw.startedAt && raw.finishedAt) {
    durationMs = new Date(raw.finishedAt).getTime() - new Date(raw.startedAt).getTime();
  }

  // A completed run may have leftover awaiting_input rows from earlier retries —
  // don't let them drag the count below 100%.
  const stepsCompleted = status === 'completed'
    ? nodes.length
    : tasks.filter((t) => normaliseRunStatus(t.status) === 'completed').length;
  const progressPct = nodes.length > 0 ? Math.round((stepsCompleted / nodes.length) * 100) : 0;

  return (
    <SidebarLayout title="Activity" subtitle={workflowName}>
      {/* ── Page header ── */}
      <div className="flex items-start gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/activity')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
          aria-label="Back to Activity"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-semibold text-foreground truncate">{workflowName}</h2>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', statusMeta.badge)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />
              {statusMeta.label}
            </span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
              #{raw.id}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {durationMs !== undefined ? `${formatDuration(durationMs)} total · ` : ''}
            {stepsCompleted}/{nodes.length} steps completed
          </p>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left: metadata + progress + outcome ── */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-4 lg:sticky lg:top-6">

          {/* Metadata card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Progress bar */}
            <div className="px-4 pt-3 pb-2 border-b border-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Progress
                </span>
                <span className="text-[11px] font-semibold text-foreground">{stepsCompleted}/{nodes.length}</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', statusMeta.bar)}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Meta rows */}
            <div className="divide-y divide-border/60">
              {/* Triggered by */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Triggered by</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-semibold text-primary">{getInitials(triggeredBy)}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{triggeredBy}</span>
                  </div>
                </div>
              </div>

              {/* Started */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Started</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{formatDate(raw.startedAt ?? raw.createdAt)}</p>
                </div>
              </div>

              {/* Completed */}
              {raw.finishedAt && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completed</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">{formatDate(raw.finishedAt)}</p>
                  </div>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {status === 'running' ? 'In progress…' : formatDuration(durationMs)}
                  </p>
                </div>
              </div>

              {/* Workflow link */}
              {workflowId && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Workflow</p>
                    <Link
                      to={`/workflows/${workflowId}`}
                      className="flex items-center gap-1 mt-0.5 text-xs text-primary hover:underline font-medium truncate"
                    >
                      {workflowName}
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Final Outcome */}
          {status === 'completed' && runId && (
            <FinalOutcomeCard runId={runId} />
          )}
        </div>

        {/* ── Right: timeline + logs ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Timeline header */}
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('h-1 w-6 rounded-full', statusMeta.line)} />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Execution Timeline · {nodes.length} step{nodes.length !== 1 ? 's' : ''}
            </p>
          </div>

          {nodes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No steps recorded yet.</p>
            </div>
          ) : (
            nodes.map((node, i) => (
              <NodeCard
                key={node.id}
                node={node}
                runId={runId!}
                stepIndex={i + 1}
                isLast={i === nodes.length - 1}
              />
            ))
          )}

          {/* Run Context */}
          {status === 'completed' && runId && (
            <RunContextSection runId={runId} />
          )}

          {/* Agent Logs */}
          {(status === 'completed' || status === 'failed') && nodes.length > 0 && runId && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Raw Logs
                </p>
              </div>
              <AgentLogsSection runId={runId} />
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
