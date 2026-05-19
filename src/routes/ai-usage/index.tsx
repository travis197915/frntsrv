import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, DollarSign, Zap, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import EmptyState from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  usageRecords,
  filterByPeriod,
  getUsageSummary,
  type UsageRecord,
  type PeriodDays,
} from './demoData';

// ── Formatters ────────────────────────────────────────────────────────────────

const numberFmt = new Intl.NumberFormat(undefined);

function formatTokens(n: number): string {
  return numberFmt.format(n);
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
      <div className="p-2 rounded-md shrink-0 bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

// ── Period tabs ───────────────────────────────────────────────────────────────

const PERIODS: { value: PeriodDays; label: string }[] = [
  { value: 7,  label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AIUsagePage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodDays>(14);
  const [search, setSearch] = useState('');

  const periodRecords = useMemo(() => filterByPeriod(usageRecords, period), [period]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return periodRecords;
    return periodRecords.filter(
      (r) =>
        r.workflowName.toLowerCase().includes(q) ||
        r.runId.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.nodeLabel.toLowerCase().includes(q) ||
        r.triggeredBy.toLowerCase().includes(q),
    );
  }, [periodRecords, search]);

  const summary = useMemo(() => getUsageSummary(period), [period]);

  const inputPct = summary.totalInputTokens + summary.totalOutputTokens > 0
    ? Math.round((summary.totalInputTokens / (summary.totalInputTokens + summary.totalOutputTokens)) * 100)
    : 0;

  return (
    <SidebarLayout
      title="AI Usage"
      subtitle="LLM token consumption and cost breakdown"
    >
      {/* Period tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-colors',
              period === p.value
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(summary.totalCost)}
          sub={summary.periodLabel}
        />
        <StatCard
          icon={Sparkles}
          label="API Calls"
          value={numberFmt.format(summary.totalCalls)}
          sub="Total LLM requests"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Input Tokens"
          value={formatTokens(summary.totalInputTokens)}
          sub={`${inputPct}% of total`}
        />
        <StatCard
          icon={ArrowDownRight}
          label="Output Tokens"
          value={formatTokens(summary.totalOutputTokens)}
          sub={`${100 - inputPct}% of total`}
        />
      </div>

      {/* Token split bar */}
      {summary.totalCalls > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-foreground">Token Distribution</p>
            <p className="text-xs text-muted-foreground">
              {formatTokens(summary.totalInputTokens + summary.totalOutputTokens)} total tokens
            </p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-primary/70 transition-all"
              style={{ width: `${inputPct}%` }}
            />
            <div className="h-full bg-muted-foreground/30 flex-1" />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-primary/70 shrink-0" />
              Input ({inputPct}%)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-muted-foreground/30 shrink-0" />
              Output ({100 - inputPct}%)
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflow, run ID, model…"
          leadingIcon={<Search className="h-4 w-4" />}
          className="w-full sm:w-[280px] h-8 text-sm"
        />
        <p className="text-xs text-muted-foreground shrink-0">
          {rows.length} record{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table / empty state */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No usage records"
          description={
            search
              ? 'No records match your search. Try adjusting the query.'
              : 'LLM calls will be logged here once workflows are executed.'
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Called</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Workflow</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Run</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Step</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Model</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Input</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Output</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rec: UsageRecord) => (
                  <tr
                    key={rec.id}
                    onClick={() => navigate(`/activity/${rec.runId}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {relativeTime(rec.calledAt)}
                      </span>
                    </td>

                    {/* Workflow */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[180px] block">
                        {rec.workflowName}
                      </span>
                    </td>

                    {/* Run ID */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {rec.runId}
                      </span>
                    </td>

                    {/* Node/Step */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[160px] block">
                        {rec.nodeLabel}
                      </span>
                    </td>

                    {/* Model */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
                        {rec.model}
                      </span>
                    </td>

                    {/* Input tokens */}
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatTokens(rec.inputTokens)}
                      </span>
                    </td>

                    {/* Output tokens */}
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatTokens(rec.outputTokens)}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs font-medium text-foreground tabular-nums">
                        {formatCost(rec.costUsd)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
