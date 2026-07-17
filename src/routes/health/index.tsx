import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchHealthSnapshot,
  type HealthComponent,
  type HealthSnapshot,
  type OverallStatus,
} from "@/lib/health";

const REFRESH_MS = 30_000;

const OVERALL: Record<
  OverallStatus,
  {
    title: string;
    subtitle: string;
    banner: string;
    Icon: typeof CheckCircle2;
  }
> = {
  operational: {
    title: "All systems operational",
    subtitle: "Every dependency responded successfully.",
    banner: "bg-emerald-600 text-white",
    Icon: CheckCircle2,
  },
  partial: {
    title: "Partial system outage",
    subtitle: "Some dependencies are unavailable.",
    banner: "bg-amber-500 text-white",
    Icon: AlertTriangle,
  },
  major: {
    title: "Major system outage",
    subtitle: "Critical dependencies are unavailable.",
    banner: "bg-red-600 text-white",
    Icon: XCircle,
  },
  unknown: {
    title: "Checking system status",
    subtitle: "Gathering health signals…",
    banner: "bg-slate-700 text-white",
    Icon: Loader2,
  },
};

function formatCheckedAt(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function groupComponents(components: HealthComponent[]) {
  const groups = new Map<string, HealthComponent[]>();
  for (const c of components) {
    const list = groups.get(c.group) ?? [];
    list.push(c);
    groups.set(c.group, list);
  }
  return groups;
}

function StatusDot({ status }: { status: "ok" | "fail" }) {
  return (
    <span
      className={
        status === "ok"
          ? "inline-block size-2.5 shrink-0 rounded-full bg-emerald-500"
          : "inline-block size-2.5 shrink-0 rounded-full bg-red-500"
      }
      aria-hidden
    />
  );
}

export default function HealthPage() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const next = await fetchHealthSnapshot();
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const overall = snapshot?.overall ?? "unknown";
  const meta = OVERALL[overall];
  const Icon = meta.Icon;
  const groups: Map<string, HealthComponent[]> = snapshot
    ? groupComponents(snapshot.components)
    : new Map();

  return (
    <div className="min-h-dvh bg-[#f6f7f9] text-foreground">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Claims Builder
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight">
              System status
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(true)}
            disabled={refreshing || loading}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <section
          className={`flex items-start gap-4 rounded-xl px-6 py-7 shadow-sm ${meta.banner}`}
        >
          <Icon
            className={`mt-0.5 size-7 shrink-0 ${overall === "unknown" ? "animate-spin" : ""}`}
          />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              {loading && !snapshot ? "Checking system status" : meta.title}
            </h2>
            <p className="mt-1 text-sm/relaxed opacity-90">
              {loading && !snapshot
                ? "Gathering health signals…"
                : meta.subtitle}
            </p>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Last checked{" "}
            <span className="font-medium text-foreground/80">
              {formatCheckedAt(snapshot?.checkedAt ?? null)}
            </span>
          </p>
          <p>Auto-refreshes every 30 seconds</p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-8 space-y-8">
          {loading && !snapshot && (
            <div className="rounded-xl border border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-3 size-5 animate-spin" />
              Loading component health…
            </div>
          )}

          {[...groups.entries()].map(([group, components]) => (
            <section key={group}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group}
              </h3>
              <ul className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                {components.map((c, i) => (
                  <li
                    key={c.key}
                    className={
                      i === 0
                        ? "flex items-center justify-between gap-4 px-5 py-4"
                        : "flex items-center justify-between gap-4 border-t border-border px-5 py-4"
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusDot status={c.status} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.label}</p>
                        {c.error ? (
                          <p className="mt-0.5 truncate text-xs text-red-600">
                            {c.error}
                          </p>
                        ) : c.detail ? (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                            {c.detail}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={
                          c.status === "ok"
                            ? "text-sm font-medium text-emerald-700"
                            : "text-sm font-medium text-red-600"
                        }
                      >
                        {c.status === "ok" ? "Operational" : "Outage"}
                      </p>
                      {typeof c.latencyMs === "number" && (
                        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          {c.latencyMs.toFixed(1)} ms
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
