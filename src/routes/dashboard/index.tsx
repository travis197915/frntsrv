import {
  Bot,
  GitBranch,
  Activity,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import StatusBadge from "@/components/StatusBadge";
import { apiClient } from "@/lib/clients";
// import { getUsageSummary } from "@/routes/ai-usage/demoData";

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconColor: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-md shrink-0 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function normaliseRunStatus(raw: string | undefined | null): string {
  const s = (raw ?? "unknown").toLowerCase();
  if (s === "pending" || s === "paused") return "running";
  return s;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () =>
      apiClient.get<{
        totalAgents: number;
        onlineAgents: number;
        activeWorkflows: number;
        totalTransactions: number;
      }>("/dashboard/stats"),
    staleTime: 60_000,
  });

  const { data: runsData, isLoading: txLoading } = useQuery({
    queryKey: ["runs", "list", { limit: 5 }],
    queryFn: () =>
      apiClient.get<{ nodes: unknown[] }>("/runs/?limit=5"),
  });

  const transactions: any[] = runsData?.nodes ?? [];
  // const aiUsage = getUsageSummary(14);

  const runsLoading = txLoading && transactions.length === 0;

  return (
    <SidebarLayout title="Dashboard">
      {/* Stat Cards */}
      {statsLoading && !stats ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Bot}
            label="Total Agents"
            value={stats?.totalAgents ?? 0}
            iconColor="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          />
          <StatCard
            icon={Activity}
            label="Online Agents"
            value={stats?.onlineAgents ?? 0}
            iconColor="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          />
          <StatCard
            icon={GitBranch}
            label="Active Workflows"
            value={stats?.activeWorkflows ?? 0}
            iconColor="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
          />
          <StatCard
            icon={Clock}
            label="Total Runs"
            value={stats?.totalTransactions ?? 0}
            iconColor="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          />
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Recent Workflow Runs
            </h2>
            {/* Activity nav hidden for now
            <Link
              to="/activity"
              className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              View all
              <ExternalLink className="h-3 w-3" />
            </Link>
            */}
          </div>
          {runsLoading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No workflow runs yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.slice(0, 5).map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {tx.workflow?.name ?? tx.pipelineName ?? tx.workflowId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                  <StatusBadge
                    status={normaliseRunStatus(tx.status)}
                    className="ml-3 shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
      </div>

      {/* AI Usage — hidden for now
      <div className="flex flex-col gap-6 mt-6">
        ...
      </div>
      */}
    </SidebarLayout>
  );
}
