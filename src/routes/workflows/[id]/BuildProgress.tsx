import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileText,
  Wand2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  workflowsApi,
  streamBuildLogs,
  type BuildStatus,
} from "@/lib/workflowsApi";
import type { BuildPhase, BuildStatusLog } from "@/interfaces/workflows";

const POLL_MS = 2000;

const PHASE_STEPS: { key: BuildPhase; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "ingesting", label: "Ingesting SOP" },
  { key: "building", label: "Building canvas" },
  { key: "done", label: "Ready" },
];

const PHASE_ORDER: Record<BuildPhase, number> = {
  idle: 0,
  queued: 0,
  ingesting: 1,
  building: 2,
  done: 3,
  failed: -1,
};

interface Props {
  workflowId: string;
  workflowName?: string;
  initial?: BuildStatus | null;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function BuildProgress({
  workflowId,
  workflowName,
  initial,
  onComplete,
  onSkip,
  onBack,
}: Props) {
  const [meta, setMeta] = useState<BuildStatus | null>(initial ?? null);
  // Logs/errors come from the SSE stream (which replays from the start on
  // connect). The poll is only a fallback if SSE never delivers (e.g. a
  // buffering proxy) — tracked via sseActiveRef to avoid duplicates.
  const [logs, setLogs] = useState<BuildStatusLog[]>([]);
  const [llmErrors, setLlmErrors] = useState<{ error: string }[]>([]);
  const logBoxRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const sseActiveRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    // Brief pause so the user sees the "Ready" tick before redirect.
    setMeta((m) => (m ? { ...m, phase: "done", built: true } : m));
    setTimeout(onComplete, 700);
  };

  // ── SSE: live log tail (keeps JWT via fetch-stream) ───────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      streamBuildLogs(
        workflowId,
        {
          onLog: (l) => {
            sseActiveRef.current = true;
            setLogs((prev) => [...prev, l]);
          },
          onLlmError: (e) => {
            sseActiveRef.current = true;
            setLlmErrors((prev) => [...prev, e]);
          },
          onDone: () => finish(),
          onFailed: () =>
            setMeta((m) => (m ? { ...m, phase: "failed" } : m)),
        },
        ctrl.signal,
      ).catch(() => {
        // Connection dropped (proxy/idle). Reconnect unless we're finished.
        if (!ctrl.signal.aborted && !completedRef.current) {
          retry = setTimeout(connect, 2000);
        }
      });
    };
    connect();

    return () => {
      ctrl.abort();
      if (retry) clearTimeout(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // ── Poll: authoritative phase / done gate ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const s = await workflowsApi.buildStatus(workflowId);
        if (cancelled) return;
        setMeta(s);
        // Fallback only: if the SSE stream never delivered (buffered proxy),
        // mirror the poll's log snapshot so the console isn't empty.
        if (!sseActiveRef.current) {
          setLogs(s.logs);
          setLlmErrors(s.llm_errors);
        }
        if (s.phase === "done" || s.built) {
          finish();
          return;
        }
        if (s.phase === "failed") return; // show error UI; stop polling
      } catch {
        /* transient */
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Auto-scroll the log console to the newest line.
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const phase: BuildPhase = meta?.phase ?? "queued";
  const isFailed = phase === "failed";
  const activeIdx = PHASE_ORDER[phase] ?? 0;
  const job = meta?.jobs?.[0];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Back to workflows"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold truncate">
          {workflowName || "New workflow"}
        </p>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <Wand2 className="h-3 w-3" />
          Auto-build
        </span>
      </header>

      {/* Centered build card */}
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-auto p-6">
        <div className="w-full max-w-2xl space-y-6">
          {/* Headline */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              {isFailed ? (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              ) : activeIdx >= 3 ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              )}
            </div>
            <h1 className="text-lg font-semibold">
              {isFailed
                ? "Auto-build couldn't finish"
                : activeIdx >= 3
                  ? "Workflow ready"
                  : "Building your workflow from the SOP…"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isFailed
                ? "Ingestion failed before the canvas could be generated. See the logs below."
                : "Every step becomes a node and every rule is attached automatically. This can take a couple of minutes."}
            </p>
          </div>

          {/* Phase stepper */}
          <div className="flex items-center justify-between gap-2">
            {PHASE_STEPS.map((step, i) => {
              const done = !isFailed && activeIdx > i;
              const active = !isFailed && activeIdx === i;
              return (
                <div key={step.key} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={[
                        "text-[10px] whitespace-nowrap",
                        active || done
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < PHASE_STEPS.length - 1 && (
                    <div
                      className={[
                        "h-px flex-1",
                        activeIdx > i ? "bg-emerald-500" : "bg-border",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* SOP / stats summary */}
          {(job || meta?.stats) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs">
              {job && (
                <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[280px]">{job.seed_url}</span>
                </span>
              )}
              {job && (
                <span className="text-muted-foreground">
                  docs: <b className="text-foreground">{job.docs_processed}</b>
                  {job.docs_failed > 0 && (
                    <span className="text-destructive">
                      {" "}
                      ({job.docs_failed} failed)
                    </span>
                  )}
                </span>
              )}
              {meta?.stats && (
                <>
                  <span className="text-muted-foreground">
                    nodes: <b className="text-foreground">{meta.stats.shapes}</b>
                  </span>
                  <span className="text-muted-foreground">
                    rules: <b className="text-foreground">{meta.stats.rules}</b>
                  </span>
                </>
              )}
            </div>
          )}

          {/* LLM errors (e.g. exhausted credits) */}
          {llmErrors.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                LLM warnings
              </p>
              {llmErrors.slice(-3).map((e, i) => (
                <p key={i} className="font-mono leading-snug break-all">
                  {e.error}
                </p>
              ))}
            </div>
          )}

          {/* Live log console */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pipeline logs
            </p>
            <div
              ref={logBoxRef}
              className="h-56 overflow-auto rounded-lg border border-border bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
            >
              {logs.length === 0 ? (
                <p className="text-zinc-500">Waiting for the worker to start…</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span
                      className={
                        l.status === "ERROR"
                          ? "text-red-400"
                          : l.status === "SKIP"
                            ? "text-zinc-500"
                            : "text-emerald-400"
                      }
                    >
                      {l.status === "ERROR"
                        ? "✗"
                        : l.status === "SKIP"
                          ? "•"
                          : "✓"}
                    </span>
                    <span className="text-sky-300">{l.stage}</span>
                    {l.doc_url && (
                      <span className="truncate text-zinc-500">{l.doc_url}</span>
                    )}
                    {l.duration_ms != null && (
                      <span className="ml-auto shrink-0 text-zinc-600">
                        {l.duration_ms}ms
                      </span>
                    )}
                    {l.error && <span className="text-red-400">— {l.error}</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {!isFailed && activeIdx < 3 && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {isFailed
                ? "Build halted."
                : activeIdx >= 3
                  ? "Opening canvas…"
                  : "You'll be taken to the canvas automatically when it's ready."}
            </span>
            {isFailed && (
              <Button variant="outline" size="sm" onClick={onSkip}>
                Open canvas anyway
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
