import {
  Bot,
  GitBranch,
  Activity,
  Clock,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import StatusBadge from "@/components/StatusBadge";
import { apiClient } from "@/lib/clients";
import { decodeJwtPayload, getToken } from "@/utils/auth";
import { getUsageSummary } from "@/routes/ai-usage/demoData";

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

  const { data: license } = useQuery({
    queryKey: ["dashboard", "license"],
    queryFn: () => {
      const token = getToken();
      if (!token) return null;
      const payload = decodeJwtPayload(token);
      const lic = {
        clientId: payload.clientId as string | undefined,
        tier: payload.tier as string | undefined,
        maxAgents: payload.maxAgents as number | undefined,
        features: payload.features as string[] | undefined,
        issuedAt: payload.issuedAt as string | undefined,
        expiresAt: payload.expiresAt as string | undefined,
        licenseId: payload.licenseId as string | undefined,
        daysLeft: payload.daysLeft as number | undefined,
        status: payload.licenseStatus as string | undefined,
      };
      const hasLicenseData =
        lic.status != null ||
        lic.tier != null ||
        lic.clientId != null ||
        lic.daysLeft != null;
      return hasLicenseData ? lic : null;
    },
    staleTime: Infinity,
  });

  const transactions: any[] = runsData?.nodes ?? [];
  const aiUsage = getUsageSummary(14);

  const runsLoading = txLoading && transactions.length === 0;

  return (
    <SidebarLayout title="Dashboard">
      {/* Stat Cards */}
      {statsLoading && !stats ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
          <StatCard
            icon={ShieldCheck}
            label="Days till Renewal"
            value={
              license?.daysLeft != null
                ? license.status === "EXPIRED" || license.daysLeft <= 0
                  ? "Expired"
                  : `${license.daysLeft}d`
                : "—"
            }
            iconColor={
              !license ||
              license.status === "EXPIRED" ||
              (license.daysLeft != null && license.daysLeft <= 0)
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : license.status === "EXPIRING_SOON" ||
                    (license.daysLeft != null && license.daysLeft < 30)
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workflow Runs */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Recent Workflow Runs
            </h2>
            <Link
              to="/activity"
              className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              View all
              <ExternalLink className="h-3 w-3" />
            </Link>
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
                <Link
                  key={tx.id}
                  to={`/activity/${tx.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/20 transition-colors"
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
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: License + AI Usage stacked */}
        <div className="flex flex-col gap-6">
          {/* License Status */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">
                License Status
              </h2>
            </div>
            {!license ? (
              <div className="py-8 text-center text-sm text-muted-foreground px-4">
                No license file found.
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <StatusBadge status={(license.status ?? "unknown").toLowerCase()} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tier</span>
                  <span className="text-xs font-medium text-foreground capitalize">
                    {license.tier}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Max Agents
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {license.maxAgents}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Expires</span>
                  <span className="text-xs font-medium text-foreground">
                    {license.expiresAt}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Days Left
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      license.daysLeft == null
                        ? "text-muted-foreground"
                        : license.daysLeft <= 0
                          ? "text-red-500"
                          : license.daysLeft < 30
                            ? "text-amber-500"
                            : "text-green-500"
                    }`}
                  >
                    {license.daysLeft == null
                      ? "—"
                      : license.daysLeft <= 0
                        ? "Expired"
                        : `${license.daysLeft} days`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AI Usage Summary — stays hardcoded */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-sm font-medium text-foreground">
                  AI Usage
                </h2>
              </div>
              <Link
                to="/ai-usage"
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                View details
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total Cost
                </span>
                <span className="text-xs font-semibold text-foreground">
                  ${aiUsage.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">API Calls</span>
                <span className="text-xs font-medium text-foreground">
                  {aiUsage.totalCalls}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Input Tokens
                </span>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {new Intl.NumberFormat().format(aiUsage.totalInputTokens)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Output Tokens
                </span>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {new Intl.NumberFormat().format(aiUsage.totalOutputTokens)}
                </span>
              </div>
              {aiUsage.totalCalls > 0 &&
                (() => {
                  const total =
                    aiUsage.totalInputTokens + aiUsage.totalOutputTokens;
                  const inputPct =
                    total > 0
                      ? Math.round((aiUsage.totalInputTokens / total) * 100)
                      : 0;
                  return (
                    <div className="pt-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="h-full bg-primary/60"
                          style={{ width: `${inputPct}%` }}
                        />
                        <div className="h-full bg-muted-foreground/25 flex-1" />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-sm bg-primary/60" />
                          In {inputPct}%
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/25" />
                          Out {100 - inputPct}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              <p className="text-[10px] text-muted-foreground pt-1">
                {aiUsage.periodLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
