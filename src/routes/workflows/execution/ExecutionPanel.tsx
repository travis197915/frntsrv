import { useEffect, useRef, useMemo, useState } from "react";
import {
  X,
  Play,
  Check,
  AlertTriangle,
  SkipForward,
  Loader2,
  Clock,
  Upload,
  ThumbsUp,
  ThumbsDown,
  FileText,
  ChevronDown,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NODE_TYPE_CONFIG, type WorkflowNode } from "../types";
import type {
  ExecutionState,
  WorkbenchRunState,
  PreflightInput,
  SopInput,
} from "./useWorkflowExecution";
import type { NodeExecutionStatus } from "./types";

interface Props {
  execution: ExecutionState;
  nodes: WorkflowNode[];
  onSubmitInteraction: (nodeId: string, data: Record<string, unknown>) => void;
  onSubmitPreflightInput: (data: PreflightInput) => void;
  onSubmitSopInput: (data: SopInput) => void;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  if (mins > 0) return `${mins}m ${s}s`;
  return `${s}s`;
}

const statusIcon: Record<NodeExecutionStatus, React.ReactNode> = {
  idle: <div className="h-2 w-2 rounded-full bg-muted-foreground/25" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  waiting_input: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  completed: <Check className="h-3.5 w-3.5 text-emerald-500" />,
  failed: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  skipped: <SkipForward className="h-3.5 w-3.5 text-muted-foreground/50" />,
};

const wbStatusIcon: Record<WorkbenchRunState["status"], React.ReactNode> = {
  pending: <div className="h-2 w-2 rounded-full bg-muted-foreground/25" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  waiting_input: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  completed: <Check className="h-3.5 w-3.5 text-emerald-500" />,
  failed: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
};

type ChipDef = { label: string; cls: string };

const STATUS_CHIP: Record<NodeExecutionStatus, ChipDef | null> = {
  idle: null,
  running: {
    label: "Running",
    cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  waiting_input: {
    label: "Awaiting Input",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  completed: {
    label: "Done",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  failed: {
    label: "Failed",
    cls: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  skipped: {
    label: "Skipped",
    cls: "bg-muted/80 text-muted-foreground border-border/40",
  },
};

const WB_STATUS_CHIP: Record<WorkbenchRunState["status"], ChipDef | null> = {
  pending: null,
  running: {
    label: "Running",
    cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  waiting_input: {
    label: "Awaiting Input",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  completed: {
    label: "Done",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  failed: {
    label: "Failed",
    cls: "bg-red-500/10 text-red-600 border-red-500/30",
  },
};

// ── OutputViewer helpers ──────────────────────────────────────────────────────

function fmtKey(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const STATUS_PALETTE: Record<string, string> = {
  active:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  in_network:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  valid:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  confirmed:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  approved:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  covered:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  inactive: "bg-red-500/15 text-red-500 border-red-500/25",
  out_of_network: "bg-red-500/15 text-red-500 border-red-500/25",
  invalid: "bg-red-500/15 text-red-500 border-red-500/25",
  denied: "bg-red-500/15 text-red-500 border-red-500/25",
  failed: "bg-red-500/15 text-red-500 border-red-500/25",
  not_covered: "bg-red-500/15 text-red-500 border-red-500/25",
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  under_review:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  running: "bg-blue-500/15 text-blue-500 border-blue-500/25",
};

function getStatusClass(val: string): string | undefined {
  const key = val.toLowerCase().replace(/[\s\-]+/g, "_");
  return STATUS_PALETTE[key];
}

function OutputValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return (
      <span className="text-muted-foreground/40 italic text-[10px]">—</span>
    );
  }

  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="h-2.5 w-2.5" /> Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
        <X className="h-2.5 w-2.5" /> No
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="italic text-[10px] text-muted-foreground/50">
          None
        </span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {value.map((item, i) => (
          <span
            key={i}
            className="rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-foreground/80"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (depth >= 2 || entries.length === 0) {
      return (
        <span className="font-mono text-[10px] text-muted-foreground">
          {JSON.stringify(value)}
        </span>
      );
    }
    return (
      <div className="mt-1 w-full rounded-md border border-border/40 bg-background/50 overflow-hidden divide-y divide-border/30">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 px-2 py-1.5">
            <span className="w-[88px] shrink-0 truncate text-[10px] text-muted-foreground/70 pt-px">
              {fmtKey(k)}
            </span>
            <div className="min-w-0 flex-1">
              <OutputValue value={v} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const str = String(value);
  if (/^\$[\d,]+/.test(str)) {
    return (
      <span className="tabular-nums text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        {str}
      </span>
    );
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return (
      <span className="tabular-nums text-[10px] text-sky-500/90">{str}</span>
    );
  }
  const sc = getStatusClass(str);
  if (sc && str.length <= 26) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${sc}`}
      >
        {str.replace(/_/g, " ")}
      </span>
    );
  }
  if (/^[A-Z0-9][A-Z0-9\-\/\.]{2,}$/.test(str) && str.length <= 32) {
    return (
      <span className="font-mono text-[10px] text-foreground/80">{str}</span>
    );
  }
  return (
    <span className="text-[10px] text-foreground/90 leading-relaxed">
      {str}
    </span>
  );
}

function OutputViewer({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(data);

  const summaryEntries = useMemo(() => {
    const priority = entries.filter(([k, v]) => {
      if (typeof v !== "string" && typeof v !== "boolean") return false;
      const kl = k.toLowerCase();
      return (
        kl.includes("status") ||
        kl.includes("result") ||
        kl.includes("decision") ||
        kl.includes("network") ||
        kl.includes("eligib") ||
        kl.includes("valid") ||
        kl.endsWith("id") ||
        kl.includes("amount") ||
        kl.includes("charges")
      );
    });
    return priority.slice(0, 3);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="mt-2.5 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span>Output</span>
        <span className="ml-auto text-[9px] font-normal normal-case tracking-normal text-muted-foreground/40">
          {entries.length} field{entries.length !== 1 ? "s" : ""}
        </span>
      </button>

      {!expanded && summaryEntries.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {summaryEntries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-1 min-w-0">
              <span className="shrink-0 text-[9px] text-muted-foreground/50">
                {fmtKey(k)}:
              </span>
              <OutputValue value={v} />
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/30">
          {entries.map(([key, value]) => {
            const isComplex = typeof value === "object" && value !== null;
            return (
              <div
                key={key}
                className={`px-3 py-2 ${isComplex ? "flex flex-col gap-1" : "flex items-start gap-3"}`}
              >
                <span
                  className={`text-[10px] font-medium text-muted-foreground/70 ${isComplex ? "" : "w-[110px] shrink-0 pt-px"}`}
                >
                  {fmtKey(key)}
                </span>
                <div
                  className={isComplex ? "w-full" : "min-w-0 flex-1 text-right"}
                >
                  <OutputValue value={value} depth={1} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveInteractionForm({
  workbenchId,
  prompt,
  onSubmit,
}: {
  workbenchId: string;
  prompt: string | null;
  onSubmit: (nodeId: string, data: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        {prompt ?? "Input required to continue"}
      </p>
      <textarea
        className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        rows={3}
        placeholder="Enter your response…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!text.trim()}
          onClick={() => onSubmit(workbenchId, { input: text.trim() })}
        >
          <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
          Submit & Continue
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => onSubmit(workbenchId, { input: "", skip: true })}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

function InteractionForm({
  nodeId,
  nodeState,
  onSubmit,
}: {
  nodeId: string;
  nodeState: { interactionType?: string; interactionPrompt?: string };
  onSubmit: (nodeId: string, data: Record<string, unknown>) => void;
}) {
  const type = nodeState.interactionType;

  if (type === "file_upload") {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          {nodeState.interactionPrompt}
        </p>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4">
          <Upload className="h-5 w-5 text-amber-500" />
          <p className="text-[11px] text-muted-foreground">
            Drag files here or click to browse
          </p>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() =>
            onSubmit(nodeId, {
              files: ["clinical_notes.pdf", "xray_report.pdf"],
            })
          }
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Upload & Continue
        </Button>
      </div>
    );
  }

  if (type === "approval") {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          {nodeState.interactionPrompt}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onSubmit(nodeId, { decision: "approved" })}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => onSubmit(nodeId, { decision: "denied" })}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
            Deny
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        {nodeState.interactionPrompt}
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => onSubmit(nodeId, { submitted: true })}
      >
        <Play className="h-3.5 w-3.5 mr-1.5" />
        Submit & Continue
      </Button>
    </div>
  );
}

function AgentLogStream({ log }: { log: string }) {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [log]);

  return (
    <pre
      ref={ref}
      className="mt-2 p-2 rounded-md bg-muted/60 text-[10px] font-mono text-muted-foreground overflow-y-auto max-h-[120px] leading-relaxed whitespace-pre-wrap"
    >
      {log || "Initializing…"}
    </pre>
  );
}

// ── Preflight interaction form (live mode, claim_preflight nodes) ─────────────

function PreflightInteractionForm({
  prompt,
  claimIds,
  onSubmit,
}: {
  prompt: string | null;
  claimIds?: string[];
  onSubmit: (data: PreflightInput) => void;
}) {
  const isResolution = claimIds && claimIds.length > 0;
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const resolveCanSubmit = selectedClaimId.length > 0;
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [claimId, setClaimId] = useState("");
  const initialCanSubmit = !!excelFile && !!pdfFile;

  if (isResolution) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          {prompt ?? "OCR found multiple matching Claim IDs. Select the correct one to continue."}
        </p>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Claim ID
          </label>
          <select
            value={selectedClaimId}
            onChange={(e) => setSelectedClaimId(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a Claim ID…</option>
            {claimIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!resolveCanSubmit}
          onClick={() => onSubmit({ claimId: selectedClaimId })}
        >
          <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
          Confirm &amp; Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">
        {prompt ?? "Upload the claims Excel and the claim form PDF. The Claim ID is detected automatically from OCR."}
      </p>

      {/* Excel upload */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Claims Excel sheet
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 hover:bg-amber-500/10 transition-colors">
          <Upload className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-[11px] text-muted-foreground truncate">
            {excelFile ? excelFile.name : "Choose .xlsx file…"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* PDF upload */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Claim form PDF
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 hover:bg-amber-500/10 transition-colors">
          <FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-[11px] text-muted-foreground truncate">
            {pdfFile ? pdfFile.name : "Choose .pdf file…"}
          </span>
          <input
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* Claim ID — optional, OCR auto-detects */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Claim ID <span className="normal-case font-normal">(optional — auto-detected from OCR)</span>
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="e.g. CLM-12345"
          value={claimId}
          onChange={(e) => setClaimId(e.target.value)}
        />
      </div>

      <Button
        size="sm"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={!initialCanSubmit}
        onClick={() => {
          if (excelFile && pdfFile) {
            onSubmit({ excelFile, pdfFile, claimId: claimId.trim() || undefined });
          }
        }}
      >
        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
        Validate &amp; Continue
      </Button>
    </div>
  );
}

// ── SOP HTML file upload form ─────────────────────────────────────────────────

function SopInteractionForm({ onSubmit }: { onSubmit: (data: SopInput) => void }) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const newOnes = Array.from(incoming).filter((f) => !names.has(f.name));
      return [...prev, ...newOnes];
    });
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">
        Upload one or more SOP HTML files. They will be ingested into the knowledge graph before this step runs.
      </p>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-500/40 bg-blue-500/5 px-3 py-4 hover:bg-blue-500/10 transition-colors">
        <Upload className="h-5 w-5 text-blue-500" />
        <span className="text-[11px] text-muted-foreground">
          Click to choose .html file(s)
        </span>
        <input
          type="file"
          accept=".html,.htm"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <FileText className="h-3 w-3 shrink-0 text-blue-500" />
              <span className="text-[11px] text-foreground truncate flex-1">{f.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={files.length === 0}
        onClick={() => onSubmit({ htmlFiles: files })}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        Upload &amp; Run SOP Ingest
      </Button>
    </div>
  );
}

function WorkbenchRunCard({
  run,
  isActive,
  onSubmitInteraction,
  onSubmitPreflightInput,
  onSubmitSopInput,
}: {
  run: WorkbenchRunState;
  isActive: boolean;
  onSubmitInteraction: (nodeId: string, data: Record<string, unknown>) => void;
  onSubmitPreflightInput: (data: PreflightInput) => void;
  onSubmitSopInput: (data: SopInput) => void;
}) {
  const chip = WB_STATUS_CHIP[run.status];
  const hasOutputs = run.outputs && Object.keys(run.outputs).length > 0;

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        isActive
          ? "border-blue-500/30 bg-blue-500/5"
          : run.status === "failed"
            ? "border-red-500/20 bg-red-500/5"
            : "border-border bg-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="shrink-0">{wbStatusIcon[run.status]}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">
            {run.name}
          </p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Cpu className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">
              {run.executorType.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        {chip && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${chip.cls}`}
          >
            {chip.label}
          </span>
        )}
      </div>

      {/* Awaiting input form — dispatched by executor type / step name */}
      {isActive && run.status === "waiting_input" && (
        run.executorType.toUpperCase().includes("PREFLIGHT") ? (
          <PreflightInteractionForm
            prompt={run.inputPrompt}
            claimIds={run.claimIdsForResolution}
            onSubmit={onSubmitPreflightInput}
          />
        ) : run.name.toLowerCase().includes("sop") ? (
          <SopInteractionForm onSubmit={onSubmitSopInput} />
        ) : (
          <LiveInteractionForm
            workbenchId={run.workbenchId}
            prompt={run.inputPrompt}
            onSubmit={onSubmitInteraction}
          />
        )
      )}

      {/* Output for completed */}
      {run.status === "completed" && hasOutputs && (
        <OutputViewer data={run.outputs} />
      )}

      {/* Error for failed */}
      {run.status === "failed" && run.error && (
        <p className="mt-1.5 text-[10px] text-red-500 wrap-break-word">
          {run.error}
        </p>
      )}
    </div>
  );
}

export default function ExecutionPanel({
  execution,
  nodes,
  onSubmitInteraction,
  onSubmitPreflightInput,
  onSubmitSopInput,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const executionNodes = useMemo(
    () => nodes.filter((n) => n.type !== "workarea"),
    [nodes],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [execution.stepOrder.length, execution.workbenchRuns.length]);

  // Progress counters
  const { completedCount, totalCount } = useMemo(() => {
    if (execution.isLive) {
      const completed = execution.workbenchRuns.filter(
        (r) => r.status === "completed" || r.status === "failed",
      ).length;
      return {
        completedCount: completed,
        totalCount: execution.workbenchRuns.length,
      };
    }
    if (execution.status === "completed") {
      return {
        completedCount: executionNodes.length,
        totalCount: executionNodes.length,
      };
    }
    const completed = Array.from(execution.nodeStates.values()).filter(
      (s) => s.status === "completed" || s.status === "skipped",
    ).length;
    return { completedCount: completed, totalCount: executionNodes.length };
  }, [execution, executionNodes]);

  return (
    <aside className="w-[380px] shrink-0 flex flex-col border-l border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex h-5 w-5 items-center justify-center">
            {execution.status === "running" && (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            )}
            {execution.status === "paused" && (
              <Clock className="h-4 w-4 text-amber-500" />
            )}
            {execution.status === "completed" && (
              <Check className="h-4 w-4 text-emerald-500" />
            )}
            {execution.status === "failed" && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            {execution.status === "cancelled" && (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {execution.isLive ? "Live Run" : "Simulated Run"}
            </p>
            {execution.runId && (
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                #{execution.runId}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {formatDuration(execution.elapsedMs)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">
            {execution.isLive ? "Phases" : "Steps"}
          </span>
          <span className="text-[10px] font-medium text-foreground tabular-nums">
            {completedCount}
            {totalCount > 0 ? ` / ${totalCount}` : ""}
            {execution.status === "running" && totalCount === 0
              ? " starting…"
              : ""}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              execution.status === "completed"
                ? "bg-emerald-500"
                : execution.status === "failed"
                  ? "bg-red-500"
                  : "bg-blue-500"
            }`}
            style={{
              width:
                totalCount > 0
                  ? `${(completedCount / totalCount) * 100}%`
                  : execution.status === "running"
                    ? "10%"
                    : "0%",
            }}
          />
        </div>
      </div>

      {/* Step timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      >
        {/* ── Live mode: workbench run cards ── */}
        {execution.isLive && (
          <>
            {execution.workbenchRuns.length === 0 &&
              execution.status === "running" && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                  <Loader2 className="h-5 w-5 animate-spin mb-2" />
                  <p className="text-xs">Starting workflow…</p>
                </div>
              )}
            {execution.workbenchRuns.map((run) => (
              <WorkbenchRunCard
                key={run.workbenchId}
                run={run}
                isActive={run.workbenchId === execution.currentNodeId}
                onSubmitInteraction={onSubmitInteraction}
                onSubmitPreflightInput={onSubmitPreflightInput}
                onSubmitSopInput={onSubmitSopInput}
              />
            ))}
          </>
        )}

        {/* ── Simulation mode: node-level states ── */}
        {!execution.isLive &&
          executionNodes.map((node) => {
            const nodeState = execution.nodeStates.get(node.id);
            const status: NodeExecutionStatus = nodeState?.status ?? "idle";
            const cfg =
              NODE_TYPE_CONFIG[
                node.data.nodeType as keyof typeof NODE_TYPE_CONFIG
              ];
            const isActive = node.id === execution.currentNodeId;

            const chip = STATUS_CHIP[status];
            const duration =
              nodeState?.completedAt && nodeState.startedAt
                ? formatDuration(nodeState.completedAt - nodeState.startedAt)
                : null;

            return (
              <div
                key={node.id}
                className={`rounded-lg border px-3 py-2.5 transition-colors ${
                  isActive
                    ? "border-blue-500/30 bg-blue-500/5"
                    : status === "skipped"
                      ? "border-border/40 opacity-50"
                      : "border-border bg-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="shrink-0">{statusIcon[status]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {node.data.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      <span style={{ color: cfg?.color }}>{cfg?.label}</span>
                      {node.data.agentType && ` · ${node.data.agentType}`}
                    </p>
                  </div>
                  {chip && (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${chip.cls}`}
                    >
                      {chip.label}
                      {status === "completed" && duration && (
                        <span className="opacity-60 tabular-nums">
                          · {duration}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {isActive &&
                  status === "running" &&
                  nodeState?.agentLog !== undefined && (
                    <AgentLogStream log={nodeState.agentLog} />
                  )}

                {isActive && status === "waiting_input" && nodeState && (
                  <InteractionForm
                    nodeId={node.id}
                    nodeState={nodeState}
                    onSubmit={onSubmitInteraction}
                  />
                )}

                {status === "completed" && nodeState?.output && (
                  <OutputViewer data={nodeState.output} />
                )}

                {status === "failed" && nodeState?.error && (
                  <p className="mt-1.5 text-[10px] text-red-500">
                    {nodeState.error}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      {/* Summary footer */}
      {(execution.status === "completed" ||
        execution.status === "failed" ||
        execution.status === "cancelled") && (
        <div className="px-4 py-3 border-t border-border">
          <div
            className={`rounded-lg px-3 py-2.5 text-xs ${
              execution.status === "completed"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : execution.status === "failed"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {execution.status === "completed" &&
              `Run completed in ${formatDuration(execution.elapsedMs)}`}
            {execution.status === "failed" && (
              <span>
                Run failed
                {execution.error
                  ? ` — ${execution.error}`
                  : " — see details above"}
              </span>
            )}
            {execution.status === "cancelled" && "Run was cancelled"}
          </div>
        </div>
      )}
    </aside>
  );
}
