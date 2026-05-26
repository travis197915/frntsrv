import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, Activity } from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { cn } from "@/utils/utils";
import { apiClient } from "@/lib/clients";

// ── Types ─────────────────────────────────────────────────────────────────────

type RunStatus = "running" | "completed" | "failed" | "cancelled";

interface ActivityRun {
  id: string;
  workflowName: string;
  status: RunStatus;
  triggeredBy: string;
  triggeredAt: string | null;
  durationMs: number | undefined;
  stepsCompleted: number;
  totalSteps: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Map Django transaction status values to our UI RunStatus values. */
function normaliseStatus(raw: string): RunStatus {
  const s = raw.toLowerCase();
  if (s === "running" || s === "pending") return "running";
  if (s === "completed" || s === "success") return "completed";
  if (s === "failed" || s === "failure") return "failed";
  return "cancelled";
}

function mapTransactionToRun(t: any): ActivityRun {
  const tasks: any[] = t.tasks ?? [];
  const completedTasks = tasks.filter(
    (task) =>
      task.status?.toLowerCase() === "completed" ||
      task.status?.toLowerCase() === "success",
  ).length;

  let durationMs: number | undefined;
  if (t.startedAt && t.finishedAt) {
    durationMs =
      new Date(t.finishedAt).getTime() - new Date(t.startedAt).getTime();
  }

  return {
    id: String(t.id),
    workflowName:
      t.workflow?.name ?? t.pipelineName ?? t.workflowId ?? "Unknown Workflow",
    status: normaliseStatus(t.status),
    triggeredBy: t.triggeredBy ?? "System",
    triggeredAt: t.createdAt ?? t.startedAt ?? null,
    durationMs,
    stepsCompleted: completedTasks,
    totalSteps: tasks.length || 1,
  };
}

// ── Status meta ───────────────────────────────────────────────────────────────

const STATUS_META: Record<
  RunStatus,
  { label: string; badge: string; dot: string }
> = {
  running: {
    label: "Running",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500 animate-pulse",
  },
  completed: {
    label: "Completed",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

function RunStatusBadge({ status }: { status: RunStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.cancelled;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        meta.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
      {meta.label}
    </span>
  );
}

// ── Status tabs ───────────────────────────────────────────────────────────────

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: runsData, isLoading: loading } = useQuery({
    queryKey: ["runs", "list", { status: statusFilter }],
    queryFn: () => {
      const q = new URLSearchParams();
      if (statusFilter) q.set("status", statusFilter);
      return apiClient.get<{ nodes: unknown[] }>(`/runs/?${q}`);
    },
  });

  const rawRuns: ActivityRun[] = useMemo(() => {
    const nodes: any[] = runsData?.nodes ?? [];
    return nodes.map(mapTransactionToRun);
  }, [runsData]);

  const runs = useMemo(() => {
    let filtered = rawRuns;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.workflowName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.triggeredBy.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [rawRuns, search]);

  const runningCount = rawRuns.filter((r) => r.status === "running").length;
  const isLoading = loading && rawRuns.length === 0;

  return (
    <SidebarLayout
      title="Activity"
      subtitle="Past pipeline executions and run history"
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by workflow, run ID, user…"
          wrapperClassName="w-full sm:w-[260px]"
          className="h-8 text-sm"
        />
      </div>

      {/* Status tabs + summary */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground shrink-0">
          {runs.length} run{runs.length !== 1 ? "s" : ""}
          {runningCount > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600 dark:text-blue-400">
                {runningCount} running
              </span>
            </span>
          )}
        </p>
      </div>

      {/* Table / loading / empty state */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No runs found"
          description={
            search || statusFilter
              ? "No runs match your filters. Try adjusting your search."
              : "Pipeline executions will appear here once workflows are run."
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Run
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Workflow
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Steps
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Triggered by
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Started
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run: ActivityRun) => (
                  <tr
                    key={run.id}
                    onClick={() => navigate(`/activity/${run.id}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    {/* Run ID */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {run.id}
                      </span>
                    </td>

                    {/* Workflow name */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[200px] block">
                        {run.workflowName}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <RunStatusBadge status={run.status} />
                    </td>

                    {/* Steps progress */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              {
                                "bg-emerald-500": run.status === "completed",
                                "bg-blue-500": run.status === "running",
                                "bg-red-400": run.status === "failed",
                                "bg-slate-400": run.status === "cancelled",
                              },
                            )}
                            style={{
                              width: `${Math.round((run.stepsCompleted / run.totalSteps) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {run.stepsCompleted}/{run.totalSteps}
                        </span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {run.status === "running" ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            In progress
                          </span>
                        ) : (
                          formatDuration(run.durationMs)
                        )}
                      </div>
                    </td>

                    {/* Triggered by */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-semibold text-primary">
                            {getInitials(run.triggeredBy)}
                          </span>
                        </div>
                        <span className="text-xs text-foreground">
                          {run.triggeredBy}
                        </span>
                      </div>
                    </td>

                    {/* Started at */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {relativeTime(run.triggeredAt)}
                      </span>
                    </td>

                    {/* Row arrow */}
                    <td className="px-4 py-3.5">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
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
