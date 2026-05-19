import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import {
  ArrowLeft,
  Bot,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Cpu,
  Zap,
  Loader2,
} from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import { cn } from '@/lib/utils';
import { GET_AGENT_QUERY } from '@/graphql/agent.graphql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function humaniseKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  online:  { dot: 'bg-emerald-500',           badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Online' },
  busy:    { dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',           label: 'Busy' },
  offline: { dot: 'bg-slate-400',             badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',           label: 'Offline' },
  error:   { dot: 'bg-red-500',               badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',               label: 'Error' },
  idle:    { dot: 'bg-slate-400',             badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',           label: 'Idle' },
};

function AgentStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status.toLowerCase()] ?? STATUS_META.offline;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
      {meta.label}
    </span>
  );
}

// ── Metadata property list ────────────────────────────────────────────────────

function MetaValue({ value }: { value: string | number | boolean | null }): React.ReactElement {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic text-xs">—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        value
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      )}>
        {value
          ? <><CheckCircle2 className="h-3 w-3" />Yes</>
          : <><XCircle className="h-3 w-3" />No</>
        }
      </span>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <span key={i} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-foreground">{String(value)}</span>;
}

function MetadataBlock({ data }: { data: Record<string, string | number | boolean | null> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border/60 overflow-hidden">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-start gap-4 px-3 py-2.5">
          <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">
            {humaniseKey(key)}
          </span>
          <div className="flex-1 min-w-0">
            <MetaValue value={val} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading } = useQuery(GET_AGENT_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  if (loading) {
    return (
      <SidebarLayout title="Agent">
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  const agentRaw = (data as any)?.agent;

  if (!agentRaw) {
    return (
      <SidebarLayout title="Agent">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <XCircle className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Agent not found</p>
          <p className="text-xs text-muted-foreground">No agent matches ID "{id}".</p>
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Back to Agents
          </button>
        </div>
      </SidebarLayout>
    );
  }

  const agent = {
    id:           agentRaw.id ?? agentRaw.name,
    name:         agentRaw.name,
    type:         agentRaw.type ?? 'pipeline-agent',
    status:       agentRaw.status ?? agentRaw.latestStatus ?? 'offline',
    description:  agentRaw.description ?? `Agent for ${agentRaw.name}`,
    capabilities: agentRaw.capabilities ?? agentRaw.pipelines ?? [],
    lastSeenAt:   agentRaw.lastSeenAt ?? null,
    metadata:     agentRaw.metadata ?? '{}',
    createdAt:    agentRaw.createdAt ?? null,
    updatedAt:    agentRaw.updatedAt ?? null,
    recentExecutions: agentRaw.recentExecutions ?? [],
  };

  let metadata: Record<string, string | number | boolean | null> = {};
  try {
    const parsed: unknown = typeof agent.metadata === 'string'
      ? JSON.parse(agent.metadata)
      : agent.metadata;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, string | number | boolean | null>;
    }
  } catch {
    metadata = {};
  }

  return (
    <SidebarLayout title="Agent Detail" subtitle={agent.type}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
            aria-label="Back to Agents"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-semibold text-foreground">{agent.name}</h2>
              <AgentStatusBadge status={agent.status} />
              <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[11px] font-medium">
                {agent.type}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">{agent.description}</p>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left: identity & timestamps ── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <div className="rounded-xl border border-border bg-card px-4 py-1 sticky top-6">
            <InfoRow icon={<Bot className="h-4 w-4" />} label="Agent ID">
              <span className="font-mono text-xs text-muted-foreground">{agent.id}</span>
            </InfoRow>
            <InfoRow icon={<Cpu className="h-4 w-4" />} label="Type">
              <span className="text-sm font-medium text-foreground">{agent.type}</span>
            </InfoRow>
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Last Seen">
              <span className="text-sm font-medium text-foreground">{formatDate(agent.lastSeenAt)}</span>
            </InfoRow>
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Registered">
              <span className="text-sm font-medium text-foreground">{formatDate(agent.createdAt)}</span>
            </InfoRow>
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Last Updated">
              <span className="text-sm font-medium text-foreground">{formatDate(agent.updatedAt)}</span>
            </InfoRow>
          </div>
        </div>

        {/* ── Right: capabilities + runtime metadata + recent executions ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Capabilities / pipelines */}
          {agent.capabilities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Capabilities
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap: string) => (
                  <span
                    key={cap}
                    className="inline-flex items-center rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Runtime metadata */}
          {Object.keys(metadata).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Runtime Info
                </p>
              </div>
              <MetadataBlock data={metadata} />
            </div>
          )}

          {/* Recent executions */}
          {agent.recentExecutions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent Executions
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border/60 overflow-hidden">
                {agent.recentExecutions.slice(0, 10).map((exec: any) => (
                  <div key={exec.id ?? exec.task_id} className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {exec.pipelineName ?? exec.pipeline_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Step {exec.stepOrder ?? exec.step_order} · {exec.agentName ?? exec.agent_name}
                      </p>
                    </div>
                    <span className={cn(
                      'shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full',
                      exec.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : exec.status === 'FAILURE'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                    )}>
                      {exec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error callout */}
          {(agent.status === 'error' || agent.status === 'offline') && (metadata['error'] || metadata['lastConnectError']) && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                {agent.status === 'error' ? 'Agent Error' : 'Connection Error'}
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                {String(metadata['error'] ?? metadata['lastConnectError'])}
              </p>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
