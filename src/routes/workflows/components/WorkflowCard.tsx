import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Clock, MoreVertical, CheckCircle2, XCircle, AlertCircle, Wrench } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/utils';

interface WorkflowCardProps {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  config?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  needsTools?: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  disableActions?: boolean;
}

// ── Node-type trail config ─────────────────────────────────────────────────

const NODE_TYPE_META: Record<string, { bg: string; dot: string; label: string }> = {
  trigger:        { bg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-500',  label: 'Trigger' },
  agent_combo:    { bg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',             dot: 'bg-sky-500',     label: 'Agent Combo' },
  claim_preflight:{ bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',     dot: 'bg-amber-500',   label: 'Pre-flight' },
  output:         { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Output' },
  action:         { bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',        dot: 'bg-slate-400',   label: 'Script' },
};

// ── Config parsing ─────────────────────────────────────────────────────────

interface ParsedConfig {
  nodeCount: number;
  typeCounts: Record<string, number>;
}

function parseConfig(config: string | null | undefined): ParsedConfig {
  if (!config) return { nodeCount: 0, typeCounts: {} };
  try {
    const parsed = JSON.parse(config);

    // Summary format from list endpoint: {typeCounts, nodeCount}
    if (parsed.typeCounts !== undefined || parsed.nodeCount !== undefined) {
      return {
        nodeCount:  parsed.nodeCount  ?? 0,
        typeCounts: parsed.typeCounts ?? {},
      };
    }

    // Full graph format from detail endpoint: {nodes, edges}
    const nodes: Array<{ type?: string; id: string }> = parsed.nodes ?? [];
    const visible = nodes.filter((n) => n.type !== 'workarea');
    const typeCounts: Record<string, number> = {};
    for (const n of visible) {
      const t = n.type ?? 'action';
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }
    return { nodeCount: visible.length, typeCounts };
  } catch {
    return { nodeCount: 0, typeCounts: {} };
  }
}

// ── Last-run display ──────────────────────────────────────────────────────────

type LastRunStatus = 'running' | 'completed' | 'failed' | 'idle' | string;

function LastRunBadge({ status, updatedAt }: { status: LastRunStatus; updatedAt?: string | null }) {
  const key = status?.toLowerCase();
  if (key === 'running') return null;

  if (key === 'completed') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Last run passed · {relativeTime(updatedAt)}
      </div>
    );
  }

  if (key === 'failed') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-red-500 dark:text-red-400 font-medium">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        Last run failed · {relativeTime(updatedAt)}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      Not yet run
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkflowCard({
  id,
  name,
  description,
  status,
  config,
  updatedAt,
  needsTools,
  onDelete,
  disableActions,
}: WorkflowCardProps) {
  const navigate = useNavigate();
  const isRunning = status?.toLowerCase() === 'running';
  const { nodeCount, typeCounts } = parseConfig(config);

  // Build a flat dot trail (up to 12) proportional to type counts
  const trail = React.useMemo(() => {
    const dots: string[] = [];
    for (const [type, count] of Object.entries(typeCounts)) {
      for (let i = 0; i < count && dots.length < 12; i++) {
        dots.push(type);
      }
    }
    return dots;
  }, [typeCounts]);

  return (
    <div
      onClick={() => navigate(`/workflows/${id}`)}
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-black/8 hover:border-border/80 hover:-translate-y-px"
    >
      {/* Running banner */}
      {isRunning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Executing now</span>
          <span className="ml-auto text-[11px] text-blue-500 dark:text-blue-400">
            <Clock className="inline h-3 w-3 mr-0.5 -mt-px" />
            {relativeTime(updatedAt)}
          </span>
        </div>
      )}

      {/* Auto-build: tools needed banner */}
      {!isRunning && needsTools && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800">
          <Wrench className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Auto-built · add tool calls to nodes
          </span>
        </div>
      )}

      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-0">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1">
          {name}
        </h3>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(); }}
                disabled={disableActions}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pt-2 pb-3 flex-1">
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/60 space-y-2.5">
        {/* Node-type trail */}
        {trail.length > 0 && (
          <div className="flex items-center gap-1">
            {trail.map((type, i) => {
              const meta = NODE_TYPE_META[type];
              if (!meta) return null;
              return (
                <React.Fragment key={i}>
                  <span
                    title={meta.label}
                    className={cn('h-2 w-2 rounded-full shrink-0', meta.dot)}
                  />
                  {i < trail.length - 1 && (
                    <span className="h-px w-1.5 bg-border shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
            {nodeCount > trail.length && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{nodeCount - trail.length}
              </span>
            )}
          </div>
        )}

        {/* Type count pills + last-run badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(typeCounts).map(([type, count]) => {
              const meta = NODE_TYPE_META[type];
              if (!meta) return null;
              return (
                <span
                  key={type}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    meta.bg,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
                  {count} {meta.label}{count !== 1 ? 's' : ''}
                </span>
              );
            })}
          </div>
          {!isRunning && <LastRunBadge status={status} updatedAt={updatedAt} />}
        </div>
      </div>
    </div>
  );
}
