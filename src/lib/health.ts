import { AUTH_BASE, API_BASE } from "./apiClient";

export type ComponentStatus = "ok" | "fail";

export type HealthComponent = {
  key: string;
  label: string;
  group: string;
  status: ComponentStatus;
  latencyMs?: number;
  detail?: string;
  error?: string;
};

export type OverallStatus = "operational" | "partial" | "major" | "unknown";

export type HealthSnapshot = {
  overall: OverallStatus;
  checkedAt: Date;
  components: HealthComponent[];
};

type UpstreamComponent = {
  status?: string;
  detail?: string;
  error?: string;
  latency_ms?: number;
};

type UpstreamHealth = {
  status?: string;
  timestamp?: string;
  components?: Record<string, UpstreamComponent>;
};

const LABELS: Record<string, string> = {
  postgres: "PostgreSQL",
  redis: "Redis",
  mongodb: "MongoDB",
  neo4j: "Neo4j",
  rabbitmq: "RabbitMQ",
};

async function probe(
  url: string,
  group: string,
  fallbackKey: string,
): Promise<HealthComponent[]> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
    const body = (await res.json().catch(() => null)) as UpstreamHealth | null;

    if (!body?.components || typeof body.components !== "object") {
      return [
        {
          key: fallbackKey,
          label: group,
          group,
          status: res.ok && body?.status === "ok" ? "ok" : "fail",
          latencyMs,
          error: res.ok ? undefined : `HTTP ${res.status}`,
        },
      ];
    }

    return Object.entries(body.components).map(([key, value]) => ({
      key: `${fallbackKey}:${key}`,
      label: LABELS[key] ?? key,
      group,
      status: value?.status === "ok" ? "ok" : "fail",
      latencyMs:
        typeof value?.latency_ms === "number" ? value.latency_ms : latencyMs,
      detail: typeof value?.detail === "string" ? value.detail : undefined,
      error: typeof value?.error === "string" ? value.error : undefined,
    }));
  } catch (err) {
    return [
      {
        key: fallbackKey,
        label: group,
        group,
        status: "fail",
        latencyMs: Math.round((performance.now() - t0) * 10) / 10,
        error: err instanceof Error ? err.message : String(err),
      },
    ];
  }
}

function deriveOverall(components: HealthComponent[]): OverallStatus {
  if (components.length === 0) return "unknown";
  const failed = components.filter((c) => c.status === "fail").length;
  if (failed === 0) return "operational";
  if (failed === components.length) return "major";
  return "partial";
}

/** Public probes — Node auth + Django agentic (no JWT / no login redirect). */
export async function fetchHealthSnapshot(): Promise<HealthSnapshot> {
  const [authComponents, agenticComponents] = await Promise.all([
    probe(`${AUTH_BASE}/health`, "Auth backend", "auth"),
    probe(`${API_BASE}/api/health/`, "Agentic backend", "agentic"),
  ]);

  const components = [...authComponents, ...agenticComponents];
  return {
    overall: deriveOverall(components),
    checkedAt: new Date(),
    components,
  };
}
