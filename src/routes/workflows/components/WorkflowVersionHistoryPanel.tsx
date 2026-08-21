import { useState } from 'react';
import { ChevronDown, ChevronRight, Network, X, Wand2 } from 'lucide-react';
import {
  useWorkflowVersions,
  useWorkflowVersionDetail,
} from '../hooks/useWorkflowVersions';
import type {
  WorkflowVersion,
  WorkflowVersionRule,
  WorkflowVersionSop,
  WorkflowSop,
} from '@/lib/workflowsApi';
import SopGraphDialog from './SopGraphDialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/utils/utils';

interface WorkflowVersionHistoryPanelProps {
  workflowId: string;
  /** Live SOP statuses (job_id + audit_sop_id pairs) from the /graph endpoint —
   *  used ONLY to resolve a job_id for the CURRENT version's SOPs. Historical
   *  rows never resolve a graph this way (see the "View Graph" logic below). */
  liveSops: WorkflowSop[];
  onClose: () => void;
}

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

interface GraphTarget {
  jobId: string;
  auditSopId: number;
  versionLabel: string;
}

function GraphButton({
  enabled,
  tooltip,
  onClick,
}: {
  enabled: boolean;
  tooltip: string;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium transition-colors',
        enabled
          ? 'text-muted-foreground hover:text-primary cursor-pointer'
          : 'text-muted-foreground/50 cursor-not-allowed',
      )}
    >
      <Network className="h-2.5 w-2.5" />
      View Graph
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function RuleRow({ rule }: { rule: WorkflowVersionRule }) {
  const label = rule.subrule_id || rule.rule_key;
  return (
    <li className="py-1 pl-3 border-l border-border/60">
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        {rule.is_custom ? (
          <span className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 py-0.5 font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
            <Wand2 className="h-2.5 w-2.5" />
            Custom
          </span>
        ) : (
          <span className="rounded bg-muted px-1 py-0.5 font-mono text-muted-foreground">
            {label}
          </span>
        )}
        {rule.decision_type && (
          <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">
            {rule.decision_type}
          </span>
        )}
        {rule.orphaned_from_rule_key && (
          <span className="rounded bg-amber-100 px-1 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Disconnected from SOP
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-foreground" title={rule.condition}>
        <span className="text-muted-foreground">If </span>
        {rule.condition || '—'}
      </p>
      <p className="truncate text-[11px] text-muted-foreground" title={rule.action}>
        <span className="text-muted-foreground/80">Then </span>
        {rule.action || '—'}
      </p>
    </li>
  );
}

function SopSlotRow({
  sop,
  rules,
  isCurrent,
  liveSops,
  onOpenGraph,
}: {
  sop: WorkflowVersionSop;
  rules: WorkflowVersionRule[];
  isCurrent: boolean;
  liveSops: WorkflowSop[];
  onOpenGraph: (target: GraphTarget) => void;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const versionLabel = `${sop.sop_title || sop.node_key} — v${sop.sop_version_number}`;
  const liveMatch = isCurrent
    ? liveSops.find((s) => s.audit_sop_id === sop.audit_sop_id)
    : undefined;

  const enabled = isCurrent && !!liveMatch?.job_id;
  const tooltip = isCurrent
    ? enabled
      ? 'Open the SOP Knowledge Graph'
      : 'Graph not available for this SOP right now.'
    : "Graph view isn't available for superseded SOP versions.";

  return (
    <li className="py-1 pl-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-foreground">
          {sop.sop_title || sop.node_key}{' '}
          <span className="text-muted-foreground">(v{sop.sop_version_number})</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {rules.length > 0 && (
            <button
              type="button"
              onClick={() => setRulesOpen((v) => !v)}
              className="text-[10px] text-muted-foreground hover:text-primary"
            >
              {rulesOpen ? 'Hide' : `${rules.length} rule${rules.length === 1 ? '' : 's'}`}
            </button>
          )}
          <GraphButton
            enabled={enabled}
            tooltip={tooltip}
            onClick={() => {
              if (liveMatch?.job_id) {
                onOpenGraph({
                  jobId: liveMatch.job_id,
                  auditSopId: sop.audit_sop_id,
                  versionLabel,
                });
              }
            }}
          />
        </div>
      </div>
      {rulesOpen && rules.length > 0 && (
        <ul className="mt-1 space-y-1">
          {[...rules]
            .sort((a, b) => a.ordering - b.ordering)
            .map((rule) => (
              <RuleRow key={`${rule.shape_id}:${rule.rule_key}`} rule={rule} />
            ))}
        </ul>
      )}
    </li>
  );
}

function VersionRow({
  version,
  isCurrent,
  isExpanded,
  onToggleExpand,
  workflowId,
  liveSops,
  onOpenGraph,
}: {
  version: WorkflowVersion;
  isCurrent: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  workflowId: string;
  liveSops: WorkflowSop[];
  onOpenGraph: (target: GraphTarget) => void;
}) {
  // Historical rows re-fetch their own snapshot on expand so the tree reflects
  // the single-version endpoint, not a possibly-stale list entry. The current
  // row already has fresh data from the list fetch, so this is skipped for it.
  const { data: detail } = useWorkflowVersionDetail(
    workflowId,
    !isCurrent && isExpanded ? version.workflow_version : null,
  );
  const sops = (!isCurrent && isExpanded ? detail?.sops : version.sops) ?? version.sops;
  const rules = (!isCurrent && isExpanded ? detail?.rules : version.rules) ?? version.rules ?? [];

  return (
    <li className="rounded-md border border-border bg-background px-2.5 py-2">
      <button
        type="button"
        onClick={onToggleExpand}
        className="group flex w-full items-center gap-1.5 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold text-foreground">
          Workflow v{version.workflow_version}
        </span>
        {isCurrent && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Current
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {relativeTime(version.created_at)}
        </span>
      </button>
      {version.reason && (
        <p className="ml-5 mt-0.5 truncate text-[10px] text-muted-foreground/80">
          {version.reason}
        </p>
      )}

      {isExpanded && (
        <ul className="mt-1.5 space-y-0.5 border-l border-border">
          {[...sops]
            .sort((a, b) => a.order - b.order)
            .map((sop) => (
              <SopSlotRow
                key={sop.workbench_id}
                sop={sop}
                rules={rules.filter((r) => r.workbench_id === sop.workbench_id)}
                isCurrent={isCurrent}
                liveSops={liveSops}
                onOpenGraph={onOpenGraph}
              />
            ))}
        </ul>
      )}
    </li>
  );
}

export default function WorkflowVersionHistoryPanel({
  workflowId,
  liveSops,
  onClose,
}: WorkflowVersionHistoryPanelProps) {
  const { data: versions, isLoading, error } = useWorkflowVersions(workflowId);
  const currentVersionNumber = versions?.[0]?.workflow_version ?? null;
  const [expanded, setExpanded] = useState<number | null>(null);
  const [graphTarget, setGraphTarget] = useState<GraphTarget | null>(null);

  const expandedVersion = expanded ?? currentVersionNumber;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Workflow version history</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && (
          <p className="px-1 py-4 text-xs text-muted-foreground">Loading version history…</p>
        )}
        {error && (
          <p className="px-1 py-4 text-xs text-red-600 dark:text-red-400">
            Couldn't load version history.
          </p>
        )}
        {versions && versions.length === 0 && (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            No version history yet for this workflow.
          </p>
        )}
        {versions && versions.length > 0 && (
          <ul className="space-y-1.5">
            {versions.map((version) => (
              <VersionRow
                key={version.workflow_version}
                version={version}
                isCurrent={version.workflow_version === currentVersionNumber}
                isExpanded={version.workflow_version === expandedVersion}
                onToggleExpand={() =>
                  setExpanded((prev) =>
                    prev === version.workflow_version ? null : version.workflow_version,
                  )
                }
                workflowId={workflowId}
                liveSops={liveSops}
                onOpenGraph={setGraphTarget}
              />
            ))}
          </ul>
        )}
      </div>

      <SopGraphDialog
        open={!!graphTarget}
        jobId={graphTarget?.jobId ?? ''}
        auditSopId={graphTarget?.auditSopId ?? null}
        versionLabel={graphTarget?.versionLabel}
        onClose={() => setGraphTarget(null)}
      />
    </div>
  );
}
