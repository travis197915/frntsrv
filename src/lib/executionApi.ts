/**
 * Execution engine API — batch upload + SSE event stream.
 *
 * SSE uses fetch (not EventSource) so the JWT Authorization header is sent
 * through the Node relay.
 */

import { getToken } from "@/utils/auth";
import { executeClient } from "./clients";

const rstrip = (s: string) => s.replace(/\/+$/, "");
const RELAY_BASE = rstrip(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000");

export interface RunBatchAsyncResponse {
  batch_id: string;
  status: string;
  stream_url: string;
}

export interface AgentLogEvent {
  batch_id?: string;
  run_id?: string;
  ts?: number;
  level?: string;
  category?: "application" | "reasoning" | "llm" | string;
  message?: string;
  claim_id?: string;
  shape_id?: string;
  shape_label?: string;
  rule_key?: string;
  matched?: boolean;
  decision_type?: string;
  confidence?: number;
  logger?: string;
}

export type BatchEventHandler = (kind: string, data: Record<string, unknown>) => void;

export const executionApi = {
  async runBatchAsync(
    workflowId: string,
    file: File,
    opts?: { claimIdColumn?: string; sheetName?: string },
  ): Promise<RunBatchAsyncResponse> {
    const form = new FormData();
    form.append("file", file);
    if (opts?.claimIdColumn) form.append("claim_id_column", opts.claimIdColumn);
    if (opts?.sheetName) form.append("sheet_name", opts.sheetName);
    return executeClient.post<RunBatchAsyncResponse>(
      `/workflows/${workflowId}/run-batch-async/`,
      form,
    );
  },

  /**
   * Subscribe to batch SSE events until summary/error or abort.
   * `streamUrl` is the relative path from runBatchAsync (e.g. /api/execute/batches/.../events/).
   */
  async subscribeBatchEvents(
    streamUrl: string,
    onEvent: BatchEventHandler,
    signal?: AbortSignal,
  ): Promise<void> {
    const path = streamUrl.startsWith("/") ? streamUrl : `/${streamUrl}`;
    const url = `${RELAY_BASE}${path}`;
    const token = getToken();
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `SSE connect failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        if (!chunk.trim() || chunk.trimStart().startsWith(":")) continue;

        let eventKind = "message";
        let dataStr = "";
        for (const line of chunk.split("\n")) {
          if (line.startsWith("event:")) eventKind = line.slice(6).trim();
          else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
        }
        if (!dataStr) continue;

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(dataStr) as Record<string, unknown>;
        } catch {
          parsed = { message: dataStr };
        }
        onEvent(eventKind, parsed);
      }
    }
  },
};

/** Format one SSE payload as a single log line for the live log panel. */
export function formatExecutionLogLine(kind: string, data: Record<string, unknown>): string {
  const ts = new Date().toISOString().slice(11, 19);

  if (kind === "agent_log") {
    const cat = String(data.category ?? "log").toUpperCase();
    const claim = data.claim_id ? `[${data.claim_id}] ` : "";
    const level = data.level ? `${data.level} ` : "";
    return `${ts} ${level}${cat} ${claim}${data.message ?? ""}`;
  }

  if (kind === "rule_evaluated") {
    const claim = data.claim_id ? `[${data.claim_id}] ` : "";
    const matched = data.matched ? "MATCH" : "no-match";
    const reasoning = data.reasoning ? ` — ${data.reasoning}` : "";
    return `${ts} RULE ${claim}${data.rule_key ?? "?"} ${matched} (${data.decision_type ?? "-"})${reasoning}`;
  }

  if (kind === "stage") {
    const claim = data.claim_id ? `[${data.claim_id}] ` : "";
    return `${ts} STAGE ${claim}${data.node ?? "?"} ${data.status ?? ""} ${data.message ?? ""}`.trim();
  }

  if (kind === "tool_invoked") {
    const claim = data.claim_id ? `[${data.claim_id}] ` : "";
    const status = data.ok ? "ok" : "FAIL";
    return `${ts} TOOL ${claim}${data.phase ?? ""} ${data.tool_name ?? "?"} ${status} (${data.duration_ms ?? 0}ms)`;
  }

  if (kind === "shape_start") {
    const claim = data.claim_id ? `[${data.claim_id}] ` : "";
    return `${ts} SHAPE ${claim}${data.shape_label ?? data.shape_id ?? "?"} (${data.rules_total ?? 0} rules)`;
  }

  if (kind === "claim_start") {
    return `${ts} CLAIM start [${data.claim_id ?? "?"}]`;
  }

  if (kind === "claim") {
    const result = (data.result ?? data) as Record<string, unknown>;
    return `${ts} CLAIM done [${result.claim_id ?? "?"}] ${result.status ?? ""} → ${result.final_decision_type ?? "-"}`;
  }

  if (kind === "batch_start") {
    return `${ts} BATCH started — ${data.total_claims ?? 0} claims`;
  }

  if (kind === "summary") {
    return `${ts} BATCH ${data.status ?? "done"} — ${data.completed ?? 0}/${data.total_claims ?? 0} completed`;
  }

  if (kind === "error") {
    return `${ts} ERROR ${data.message ?? JSON.stringify(data)}`;
  }

  return `${ts} ${kind.toUpperCase()} ${JSON.stringify(data)}`;
}
