import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronRight } from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { cn } from "@/utils/utils";
import { apiClient } from "@/lib/clients";

// ── Status meta ───────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  online: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "Online",
  },
  busy: {
    dot: "bg-blue-500 animate-pulse",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Busy",
  },
  offline: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    label: "Offline",
  },
  error: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    label: "Error",
  },
  idle: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    label: "Idle",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status.toLowerCase()] ?? STATUS_META.offline;
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

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "online", label: "Online" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
  { value: "error", label: "Error" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AgentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  capabilities: string[];
  lastSeenAt: string | null;
  metadata: string;
  createdAt: string | null;
  updatedAt: string | null;
}

function normaliseAgent(a: any): AgentRow {
  return {
    id: a.id ?? a.name,
    name: a.name,
    type: a.type ?? "pipeline-agent",
    status: a.status ?? a.latestStatus ?? "offline",
    description: a.description ?? `Agent for ${a.name}`,
    capabilities: a.capabilities ?? a.pipelines ?? [],
    lastSeenAt: a.lastSeenAt ?? null,
    metadata: a.metadata ?? "{}",
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: agentsData, isLoading: loading } = useQuery({
    queryKey: ["agents", "list", { status: statusFilter }],
    queryFn: () => {
      const q = new URLSearchParams();
      if (statusFilter) q.set("status", statusFilter);
      return apiClient.get<unknown[]>(`/agents/?${q}`);
    },
  });

  const rawAgents: AgentRow[] = (
    Array.isArray(agentsData) ? agentsData : []
  ).map(normaliseAgent);

  const agents = useMemo(() => {
    let filtered = rawAgents;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [rawAgents, search]);

  const onlineCount = rawAgents.filter((a) => a.status === "online").length;
  const busyCount = rawAgents.filter((a) => a.status === "busy").length;

  const isLoading = loading && rawAgents.length === 0;

  return (
    <SidebarLayout
      title="Agents"
      subtitle="Registered orchestration agents available for use in workflows"
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or type…"
          wrapperClassName="w-full sm:w-[240px]"
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
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
          {onlineCount > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">
                {onlineCount} online
              </span>
            </span>
          )}
          {busyCount > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600 dark:text-blue-400">
                {busyCount} busy
              </span>
            </span>
          )}
        </p>
      </div>

      {/* Loading / empty / table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents found"
          description={
            search || statusFilter
              ? "No agents match your filters. Try adjusting your search."
              : "Registered agents will appear here once the orchestrator is connected."
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Agent
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Capabilities
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Last Seen
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {agents.map((agent: AgentRow) => (
                  <tr
                    key={agent.id}
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    {/* Agent name + description */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {agent.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[11px] font-medium">
                        {agent.type}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={agent.status} />
                    </td>

                    {/* Capabilities preview */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {agent.capabilities.slice(0, 2).map((cap) => (
                          <span
                            key={cap}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border"
                          >
                            {cap}
                          </span>
                        ))}
                        {agent.capabilities.length > 2 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{agent.capabilities.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last seen */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {relativeTime(agent.lastSeenAt)}
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
