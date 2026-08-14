import { useCallback, useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import {
  Trash2, Layers, Sparkles, Ban, Info, Network,
  Code2, ListTree, Settings2, Wrench, ChevronRight,
  ArrowRight, FileText, GitBranch, Plus, Save, CircleSlash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  NODE_TYPE_CONFIG, type WorkflowNode, type WorkflowNodeData,
} from "../types";
import { useShapeCatalog } from "./nodes/ShapeCatalogProvider";
import type { ShapeDefinition, ShapePropertyField } from "@/lib/api";
import GroupedToolsList from "./NodeAttachments/GroupedToolsList";
import AttachedRuleCard from "./NodeAttachments/AttachedRuleCard";
import FullscreenAttachmentPicker from "./NodeAttachments/HtmlFullscreenPicker";
import type { AttachedSopRule, AttachedTool, AttachableTool } from "@/interfaces/workflows";
import type { BuilderSopStatus } from "@/interfaces/builder";
import type { SopSectionsResponse, SopGraphResponse, SopGraphNode, SopGraphEdge } from "@/interfaces/sop";
import { ingestApi } from "@/lib/api";
import { workflowsApi } from "@/lib/workflowsApi";

import { toolPickKey } from "@/utils/nodeAttachments";

/** Map a catalog/attachable tool into the persisted node tool_calls shape. */
function toAttachedTool(t: AttachableTool): AttachedTool {
  const kind = (t.tool_kind || t.kind) as AttachedTool["tool_kind"];
  return {
    key: toolPickKey(t),
    tool_id: t.tool_id,
    tool_kind: kind,
    display_name: t.display_name || t.name,
    description: t.description,
    args_schema: t.args_schema,
    endpoint_id: t.endpoint_id || "",
    name: t.name,
    method: t.method || (kind === "api_agent" ? "GET" : "POST"),
    url: t.url || t.invoke_url || "",
    rule_key: null,
    rule_binding_id: null,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  workflowId?: string;
  readOnly?: boolean;
  /** Workflow's SOP list — used to resolve job_id from sop_id. */
  workflowSops?: BuilderSopStatus[];
  /** Persist the whole workflow (canvas save). Wires the panel's Save button. */
  onSave?: () => void | Promise<void>;
  /** True while a save is in flight (disables + relabels the Save button). */
  isSaving?: boolean;
  /** True when there are unsaved changes on the canvas. */
  isDirty?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DECISION_TONE: Record<string, string> = {
  DENY:        "bg-red-50 text-red-700 border-red-200",
  ALLOW:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  BYPASS:      "bg-blue-50 text-blue-700 border-blue-200",
  PEND:        "bg-amber-50 text-amber-700 border-amber-200",
  REFER:       "bg-violet-50 text-violet-700 border-violet-200",
  SYSTEM:      "bg-slate-100 text-slate-700 border-slate-200",
  STOP:        "bg-red-100 text-red-800 border-red-300",
  WAIVE:       "bg-emerald-100 text-emerald-800 border-emerald-300",
  CONDITIONAL: "bg-slate-50 text-slate-600 border-slate-200",
  NOTE:        "bg-sky-50 text-sky-700 border-sky-200",
};

const TABS = [
  { id: "rules",    label: "Rules & Tools",   icon: ListTree  },
  { id: "overview", label: "Overview",        icon: Info      },
  { id: "detail",   label: "SOP Detail",      icon: FileText  },
  { id: "schema",   label: "Pydantic Schema", icon: Code2     },
  { id: "graph",    label: "Knowledge Graph", icon: Network   },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Small helpers ─────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="flex border-b border-border bg-muted/30 shrink-0">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            active === id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone?: string }) {
  const cls = DECISION_TONE[label] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${tone ?? cls}`}>
      {label}
    </span>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground italic">
      {message}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── DynamicField / DynamicShapeInspector (unchanged logic) ───────────────────

function DynamicField({
  field, value, onChange, readOnly = false,
}: {
  field: ShapePropertyField;
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean;
}) {
  const id = `field-${field.name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {field.label}
      </label>
      {field.type === "text" ? (
        <Textarea id={id} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}
          className="min-h-[90px] resize-none text-sm" disabled={readOnly} />
      ) : field.type === "select" && field.options ? (
        <select id={id} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60">
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <Input id={id} type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          disabled={readOnly} />
      ) : field.type === "boolean" ? (
        <label className="flex items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly} className="h-4 w-4 rounded border-input" />
          <span className="text-muted-foreground">{field.label}</span>
        </label>
      ) : (
        <Textarea id={id} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px] resize-none text-sm" disabled={readOnly} />
      )}
    </div>
  );
}

function DynamicShapeInspector({ node, def, onUpdate, readOnly = false }: {
  node: WorkflowNode; def: ShapeDefinition;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void; readOnly?: boolean;
}) {
  const data = node.data as WorkflowNodeData;
  const props = (data as unknown as { properties?: Record<string, unknown> }).properties ?? {};
  const setProperty = (name: string, value: unknown) =>
    onUpdate(node.id, { properties: { ...props, [name]: value } } as unknown as Partial<WorkflowNodeData>);
  const TOP_LEVEL: Record<string, keyof WorkflowNodeData> = { label: "label", description: "description" };
  return (
    <div className="space-y-4">
      {def.property_schema.map((field) => {
        const topKey = TOP_LEVEL[field.name];
        return topKey ? (
          <DynamicField key={field.name} field={field} value={data[topKey] as unknown} readOnly={readOnly}
            onChange={(v) => onUpdate(node.id, { [topKey]: v } as Partial<WorkflowNodeData>)} />
        ) : (
          <DynamicField key={field.name} field={field} value={props[field.name]} readOnly={readOnly}
            onChange={(v) => setProperty(field.name, v)} />
        );
      })}
      {def.description && (
        <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/5 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
            <Sparkles className="h-3 w-3" />{def.label}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{def.description}</p>
        </div>
      )}
    </div>
  );
}

// ── Rules-only panel (Rules & Tools tab) ─────────────────────────────────────

function RulesOnlyPanel({
  workflowId, rules, tools, onChange, readOnly, isWorkArea,
}: {
  workflowId?: string;
  rules: AttachedSopRule[];
  tools: AttachedTool[];
  onChange: (r: AttachedSopRule[], t: AttachedTool[]) => void;
  readOnly: boolean;
  isWorkArea: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // All tools available to attach (langchain + api_agent), loaded once.
  const [availableTools, setAvailableTools] = useState<AttachableTool[]>([]);
  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    workflowsApi
      .getAttachable(workflowId)
      .then((d) => { if (!cancelled) setAvailableTools(d.tool_calls ?? []); })
      .catch((e) => {
        // Leave the list empty (dropdown shows "no tools available") but log
        // so a failing /attachable/ endpoint is debuggable.
        console.error("ConfigPanel: failed to load attachable tools", e);
      });
    return () => { cancelled = true; };
  }, [workflowId]);

  const attachedToolKeys = useMemo(
    () => new Set(tools.map((t) => toolPickKey(t))),
    [tools],
  );
  const addableTools = useMemo(
    () => availableTools.filter((t) => !attachedToolKeys.has(toolPickKey(t))),
    [availableTools, attachedToolKeys],
  );
  const addToolByKey = (pickKey: string) => {
    if (readOnly || !pickKey) return;
    const t = availableTools.find((x) => toolPickKey(x) === pickKey);
    if (!t) return;
    onChange(rules, [...tools, toAttachedTool(t)]);
  };

  const selectedKeys = useMemo(
    () => new Set<string>([
      ...rules.map((r) => r.key).filter(Boolean),
      ...tools.map((t) => toolPickKey(t)).filter(Boolean),
    ]),
    [rules, tools],
  );

  const depthByKey = useMemo(() => {
    const raw = new Map<string, number>();
    for (const r of rules) {
      if (r.source !== "decision") { raw.set(r.key, 0); continue; }
      raw.set(r.key, typeof r.depth === "number" ? r.depth : 0);
    }
    const mins = rules.filter((r) => r.source === "decision").map((r) => raw.get(r.key) ?? 0);
    const min = mins.length ? Math.min(...mins) : 0;
    const out = new Map<string, number>();
    for (const r of rules) {
      const base = raw.get(r.key) ?? 0;
      out.set(r.key, r.source === "decision" ? Math.max(0, base - min) : 0);
    }
    return out;
  }, [rules]);

  const removeRule = (key: string) => {
    if (readOnly) return;
    onChange(rules.filter((r) => r.key !== key), tools);
  };
  const moveRule = (key: string, dir: "up" | "down") => {
    if (readOnly) return;
    const idx = rules.findIndex((r) => r.key === key);
    if (idx === -1) return;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= rules.length) return;
    const next = [...rules];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next.map((r, i) => ({ ...r, ordering: i })), tools);
  };
  const updateRuleContext = (key: string, context: string) => {
    if (readOnly) return;
    onChange(rules.map((r) => r.key === key ? { ...r, additional_context: context } : r), tools);
  };
  const toggleRuleOos = (key: string, nextOos: boolean) => {
    if (readOnly) return;
    // `nextOos` is the auditor's desired EFFECTIVE scope for this rule. We store
    // it as two mutually-exclusive override flags so the backend can either add
    // OOS (`manual_out_of_scope`) or FORCE a SOP-flagged rule back in scope
    // (`manual_in_scope`). The effective `is_out_of_scope` is recomputed on the
    // next load; we set it locally so the badge updates immediately.
    onChange(
      rules.map((r) =>
        r.key === key
          ? {
              ...r,
              manual_out_of_scope: nextOos,
              manual_in_scope: !nextOos,
              is_out_of_scope: nextOos,
            }
          : r,
      ),
      tools,
    );
  };
  const toggleRuleNa = (key: string, nextNa: boolean) => {
    if (readOnly) return;
    // Not-applicable is a SEPARATE axis from out-of-scope: a non-scoring routing
    // gate the engine skips deterministically (renders NOT_APPLICABLE, never a
    // finding, never halts the SOP). The backend recomputes `manual_na_rule_keys`
    // from this per-rule flag on save and re-emits it on load. Marking NA clears
    // any force-in-scope override so the two don't fight.
    onChange(
      rules.map((r) =>
        r.key === key
          ? {
              ...r,
              manual_not_applicable: nextNa,
              ...(nextNa ? { manual_in_scope: false } : {}),
            }
          : r,
      ),
      tools,
    );
  };
  const removeTool = (key: string) => {
    if (readOnly) return;
    onChange(rules, tools.filter((t) => toolPickKey(t) !== key));
  };

  if (!workflowId || isWorkArea) {
    return <EmptyState message="No rules available for this node type." />;
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Rules</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full border border-border">
              {rules.length}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Tools</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full border border-border">
              {tools.length}
            </span>
          </div>
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-[11px] gap-1"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Add / edit
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

        {/* Rules section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Rules</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {rules.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              No rules attached. Rules are auto-attached from the ingested SOP.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {rules.map((r, i) => {
                const rDepth = depthByKey.get(r.key) ?? 0;
                return (
                  <AttachedRuleCard
                    key={r.key}
                    rule={r}
                    depth={rDepth}
                    allRules={rules}
                    depthByKey={depthByKey}
                    readOnly={readOnly}
                    onRemove={readOnly ? undefined : removeRule}
                    onMoveUp={readOnly || i === 0 ? undefined : () => moveRule(r.key, "up")}
                    onMoveDown={readOnly || i >= rules.length - 1 ? undefined : () => moveRule(r.key, "down")}
                    onContextChange={readOnly ? undefined : updateRuleContext}
                    onToggleOutOfScope={readOnly ? undefined : toggleRuleOos}
                    onToggleNotApplicable={readOnly ? undefined : toggleRuleNa}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {/* Tool calls section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tool Calls</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {/* Inline dropdown — pick a tool to attach without leaving the panel */}
          {!readOnly && (
            <div className="mb-3">
              {addableTools.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    addToolByKey(e.target.value);
                    e.currentTarget.value = "";
                  }}
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">+ Add a tool call…</option>
                  {addableTools.map((t) => {
                    const kind = (t.tool_kind || t.kind) === "langchain" ? "LC" : (t.method || "AGENT");
                    return (
                      <option key={toolPickKey(t)} value={toolPickKey(t)}>
                        [{kind}] {t.display_name || t.name}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  {availableTools.length === 0
                    ? "No tools available to attach."
                    : "All available tools are attached."}
                </p>
              )}
            </div>
          )}
          {tools.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              No tool calls attached yet{readOnly ? "." : " — pick one from the dropdown above."}
            </p>
          ) : (
            <GroupedToolsList
              tools={tools}
              rules={rules}
              onRemove={readOnly ? undefined : removeTool}
            />
          )}
        </div>
      </div>

      {pickerOpen && (
        <FullscreenAttachmentPicker
          workflowId={workflowId}
          selectedKeys={selectedKeys}
          existingRules={rules}
            readOnly={readOnly}
          onClose={() => setPickerOpen(false)}
          onSave={(r, t) => onChange(r, t)}
        />
      )}
    </>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ node, def, onUpdate, readOnly, manualOos, manualNa, props }: {
  node: WorkflowNode; def?: ShapeDefinition;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  readOnly: boolean; manualOos: boolean; manualNa: boolean; props: Record<string, unknown>;
}) {
  const data = node.data as WorkflowNodeData;
  const isWorkArea = data.nodeType === "workarea";
  const stepQuestion = typeof props.step_question === "string" ? props.step_question : "";
  const stepNumber = props.step_number != null ? String(props.step_number) : "";
  const sopTitle = typeof props.sop_title === "string" ? props.sop_title : "";
  const ruleGroup = typeof props.rule_group === "string" ? props.rule_group : "";

  const update = useCallback((field: keyof WorkflowNodeData, value: string) =>
    onUpdate(node.id, { [field]: value }), [node.id, onUpdate]);

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      {/* Identity */}
      {(stepNumber || sopTitle || ruleGroup) && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-1.5">
          {sopTitle && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground w-16 shrink-0 pt-0.5">SOP</span>
              <span className="text-xs text-foreground leading-snug">{sopTitle}</span>
            </div>
          )}
          {stepNumber && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground w-16 shrink-0 pt-0.5">Step</span>
              <span className="text-xs text-foreground">{stepNumber}</span>
            </div>
          )}
          {ruleGroup && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground w-16 shrink-0 pt-0.5">Group</span>
              <span className="text-xs text-foreground">{ruleGroup}</span>
            </div>
          )}
        </div>
      )}

      {/* Condition */}
      {stepQuestion && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5">Condition</p>
          <p className="text-sm font-medium leading-snug text-foreground">{stepQuestion}</p>
        </div>
      )}

      {/* Node settings */}
      <div>
        <SectionHeading icon={Settings2} title="Node Settings" />
        {def && !isWorkArea ? (
          <DynamicShapeInspector node={node} def={def} onUpdate={onUpdate} readOnly={readOnly} />
        ) : isWorkArea ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phase Name</label>
              <Input value={data.label} onChange={(e) => update("label", e.target.value)}
                placeholder="e.g. Data Ingestion" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={data.description ?? ""} onChange={(e) => update("description", e.target.value)}
                className="min-h-[80px] resize-none" disabled={readOnly} />
            </div>
          </div>
        ) : null}
            </div>

      {/* Execution control */}
      {!isWorkArea && (
        <div>
          <SectionHeading icon={Ban} title="Execution Control" />
          <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
            manualOos ? "border-rose-500/40 bg-rose-500/8" : "border-border bg-muted/30"
          } ${readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted/50"}`}>
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-rose-500 shrink-0"
              checked={manualOos} disabled={readOnly}
              onChange={(e) => onUpdate(node.id, {
                properties: { ...props, manual_out_of_scope: e.target.checked },
              } as unknown as Partial<WorkflowNodeData>)} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Ban className={`h-3.5 w-3.5 ${manualOos ? "text-rose-400" : "text-muted-foreground"}`} />
                Mark out of scope
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                Execution engine skips every rule on this node (no LLM call) and continues with the rest of the workflow.
              </p>
            </div>
          </label>
          <label className={`mt-2 flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
            manualNa ? "border-amber-500/40 bg-amber-500/8" : "border-border bg-muted/30"
          } ${readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted/50"}`}>
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-500 shrink-0"
              checked={manualNa} disabled={readOnly}
              onChange={(e) => onUpdate(node.id, {
                properties: { ...props, manual_not_applicable: e.target.checked },
              } as unknown as Partial<WorkflowNodeData>)} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <CircleSlash className={`h-3.5 w-3.5 ${manualNa ? "text-amber-500" : "text-muted-foreground"}`} />
                Mark not applicable
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                Every rule on this node renders NOT APPLICABLE in execution (no LLM call, never a finding). Other steps still run independently.
              </p>
            </div>
          </label>
        </div>
      )}

    </div>
  );
}

// ── Tab: SOP Detail — autobuild text with clickable step refs ────────────────

/** Parse text for "Step N" / "step N" refs; return segments ready to render. */
function parseStepRefs(text: string): Array<{ type: "text"; val: string } | { type: "step"; n: number; val: string }> {
  const parts: Array<{ type: "text"; val: string } | { type: "step"; n: number; val: string }> = [];
  const re = /\bstep\s+(\d+)\b/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", val: text.slice(last, m.index) });
    parts.push({ type: "step", n: Number(m[1]), val: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", val: text.slice(last) });
  return parts;
}

function SopDetailTab({
  stepDetail, jobId,
}: { stepDetail: string; jobId: string | null }) {
  const [sections, setSections] = useState<SopSectionsResponse | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [focusStep, setFocusStep] = useState<number | null>(null);

  // Lazy-load sections only when first step ref is clicked
  const loadSections = useCallback(() => {
    if (!jobId || sections || loadingSections) return;
    setLoadingSections(true);
    ingestApi.get<SopSectionsResponse>(`/${jobId}/sections/`)
      .then(setSections)
      .catch(() => null)
      .finally(() => setLoadingSections(false));
  }, [jobId, sections, loadingSections]);

  const handleStepClick = useCallback((n: number) => {
    setFocusStep(n);
    loadSections();
  }, [loadSections]);

  const focusedStep = useMemo(
    () => sections?.steps.find((s) => s.step_number === focusStep) ?? null,
    [sections, focusStep],
  );

  if (!stepDetail) return <EmptyState message="No autobuild detail available for this node." />;

  // Split raw text into labelled sections by the autobuild format:
  // Title line / Description / "Decision rows (N):" / bullet rows
  const lines = stepDetail.split("\n");

  // Render a single line with step-ref highlighting
  function renderLine(line: string, key: number) {
    const segments = parseStepRefs(line);
    return (
      <span key={key}>
        {segments.map((seg, i) =>
          seg.type === "step" ? (
            <button
              key={i}
              type="button"
              onClick={() => handleStepClick(seg.n)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors border mx-0.5 ${
                focusStep === seg.n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              <GitBranch className="h-2.5 w-2.5 shrink-0" />
              {seg.val}
            </button>
          ) : (
            <span key={i}>{seg.val}</span>
          )
        )}
      </span>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: autobuild text ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-1 min-w-0 border-r border-border">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Autobuild Detail
          {jobId && (
            <span className="ml-2 normal-case font-normal text-muted-foreground/60">
              · click a step reference to preview it →
            </span>
          )}
        </p>
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-2" />;

          // Section title (no leading space, no bullet)
          if (!line.startsWith(" ") && !line.startsWith("·") && !line.startsWith("-") && !line.startsWith("•") && !line.match(/^\s*\[row/)) {
            return (
              <p key={i} className="text-xs font-semibold text-foreground mt-2 first:mt-0">
                {renderLine(line, i)}
              </p>
            );
          }

          // Decision row bullet: "· [rowN] TYPE — IF: ... THEN: ..."
          const rowMatch = line.match(/^\s*[·•\-]?\s*(\[row\d+\])\s*(ALLOW|DENY|BYPASS|PEND|REFER|STOP|WAIVE|SYSTEM|CONDITIONAL|NOTE)\s*[—-]\s*(.*)$/i);
          if (rowMatch) {
            const [, rowId, dtype, rest] = rowMatch;
            const tone = DECISION_TONE[dtype.toUpperCase()] ?? "bg-slate-50 text-slate-600 border-slate-200";
            return (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                <span className="font-mono text-[9px] text-muted-foreground shrink-0 mt-0.5 w-10">{rowId}</span>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${tone}`}>{dtype}</span>
                <span className="text-[11px] text-foreground leading-snug min-w-0">{renderLine(rest, i)}</span>
              </div>
            );
          }

          // Generic line
          return (
            <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">
              {renderLine(line, i)}
            </p>
          );
        })}
      </div>

      {/* ── Right: focused step card ── */}
      <div className="w-80 shrink-0 overflow-y-auto bg-muted/10">
        {!focusStep ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <GitBranch className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Click a highlighted <span className="text-indigo-600 font-semibold">Step N</span> reference on the left to preview it here.
            </p>
          </div>
        ) : loadingSections ? (
          <div className="flex items-center justify-center h-32"><Spinner /></div>
        ) : focusedStep ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-indigo-700">{focusedStep.step_number}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Step {focusedStep.step_number}</p>
                {focusedStep.is_terminal && (
                  <span className="text-[9px] px-1 py-px rounded bg-red-100 text-red-600 border border-red-200 font-semibold">TERMINAL</span>
                )}
              </div>
            </div>

            {focusedStep.question && (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 px-3 py-2">
                <p className="text-[10px] font-semibold text-amber-600 mb-1">Question</p>
                <p className="text-xs font-medium leading-snug">{focusedStep.question}</p>
              </div>
            )}

            {focusedStep.intro_text && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{focusedStep.intro_text}</p>
            )}

            {focusedStep.decisions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {focusedStep.decisions.length} Decision row{focusedStep.decisions.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1.5">
                  {focusedStep.decisions.map((d, i) => {
                    const tone = DECISION_TONE[d.decision_type] ?? "bg-slate-50 text-slate-600 border-slate-200";
                    const childCount = (d.children ?? []).length;
                    return (
                      <div key={d.subrule_id || i} className="rounded border border-border bg-background px-2.5 py-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${tone}`}>
                            {d.decision_type}
                          </span>
                          {childCount > 0 && (
                            <span className="text-[9px] px-1 py-px rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                              +{childCount} sub
                            </span>
                          )}
                          {d.goto_step != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                              <ArrowRight className="h-2.5 w-2.5" /> Step {d.goto_step}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-snug text-foreground">{d.condition_if}</p>
                        {d.action_text && (
                          <p className="text-[10px] text-muted-foreground border-l-2 border-border pl-1.5">{d.action_text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <p className="text-xs text-muted-foreground">Step {focusStep} not found in this SOP.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── YAML syntax highlighter (no extra deps beyond js-yaml) ───────────────────

function YamlBlock({ value }: { value: unknown }) {
  const raw = useMemo(() => {
    try {
      return yaml.dump(value, { indent: 2, lineWidth: 120, noRefs: true });
    } catch {
      return String(value);
    }
  }, [value]);

  // Tokenise for colour: keys, strings, numbers, booleans, null, comments.
  const lines = raw.split("\n");

  function colourLine(line: string) {
    // Indent + optional list marker
    const m = line.match(/^(\s*(?:-\s+)?)(.*)$/);
    if (!m) return <span>{line}</span>;
    const [, indent, rest] = m;

    // key: value pair
    const kv = rest.match(/^([^:]+)(:\s*)(.*)$/);
    if (kv) {
      const [, key, colon, val] = kv;
      return (
        <>
          <span style={{ color: "#6366f1" }}>{indent}{key}</span>
          <span style={{ color: "#94a3b8" }}>{colon}</span>
          {colourValue(val)}
        </>
      );
    }
    // Plain value (list item)
    return <>{indent}{colourValue(rest)}</>;
  }

  function colourValue(v: string) {
    if (!v) return null;
    if (v === "null" || v === "~") return <span style={{ color: "#94a3b8" }}>{v}</span>;
    if (v === "true" || v === "false") return <span style={{ color: "#10b981" }}>{v}</span>;
    if (!isNaN(Number(v)) && v.trim() !== "") return <span style={{ color: "#f59e0b" }}>{v}</span>;
    if (v.startsWith("'") || v.startsWith('"') || v.startsWith("|") || v.startsWith(">"))
      return <span style={{ color: "#34d399" }}>{v}</span>;
    if (v.startsWith("#")) return <span style={{ color: "#64748b", fontStyle: "italic" }}>{v}</span>;
    return <span style={{ color: "#e2e8f0" }}>{v}</span>;
  }

  return (
    <pre
      className="rounded-lg overflow-x-auto text-[11px] leading-relaxed font-mono px-4 py-3 max-h-96"
      style={{ background: "#0f172a", color: "#e2e8f0" }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line ? colourLine(line) : " "}</div>
      ))}
    </pre>
  );
}

// ── Tab: Pydantic Schema (YAML view) ──────────────────────────────────────────

function SchemaTab({ rules }: { rules: AttachedSopRule[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (!rules.length) return <EmptyState message="No rules attached to this node." />;

  const toggle = (key: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="p-5 overflow-y-auto h-full space-y-2">
      <p className="text-[11px] text-muted-foreground mb-3">
        Pydantic-validated rule objects bound to this node — the exact payload the execution engine receives.
      </p>
      {rules.map((r) => {
        const open = expanded.has(r.key);
        return (
          <div key={r.key} className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(r.key)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
            >
              <Pill label={r.decision_type || "—"} />
              <span className="font-mono text-[11px] truncate flex-1" style={{ color: "#6366f1" }}>
                {r.key}
              </span>
              {r.depth != null && r.depth > 0 && (
                <span className="text-[9px] px-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                  depth {r.depth}
                </span>
              )}
              <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open && <YamlBlock value={r} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Knowledge Graph (Neo4j-mirrored from /api/ingest/<job_id>/graph/) ────

// Edges that mean "this node CONTAINS that node" — only these are followed
// when building the tree, so it never balloons up into the parent document or
// sideways into other steps. Everything else (GOTO / OVERRIDES / APPLIES_TO …)
// is rendered as a non-expanding reference chip on the owning node.
const GRAPH_CONTAINMENT_RELS = new Set([
  "HAS_STEP", "HAS_DECISION", "HAS_RULE", "HAS_PRE_SECTION",
  "HAS_CODE_REF", "HAS_ANNOTATION", "HAS_GROUP_LIMIT",
  "HAS_DATE_COND", "HAS_META", "HAS_REFERENCE",
]);

const GRAPH_NODE_TONE: Record<string, string> = {
  STEP:        "bg-amber-100 border-amber-300 text-amber-800",
  DECISION:    "bg-blue-100 border-blue-300 text-blue-800",
  PRE_SECTION: "bg-violet-100 border-violet-300 text-violet-800",
  PRE_RULE:    "bg-indigo-100 border-indigo-300 text-indigo-800",
  CODE:        "bg-pink-100 border-pink-300 text-pink-800",
  SOP:         "bg-emerald-100 border-emerald-300 text-emerald-800",
  DOCUMENT:    "bg-emerald-100 border-emerald-300 text-emerald-800",
};

interface GraphTreeNode {
  node: SopGraphNode;
  refs: { rel: string; target: string; label: string }[];
  children: GraphTreeNode[];
}

function GraphTab({
  jobId, stepNumber, nodeKind,
}: { jobId: string | null; stepNumber: number | null; nodeKind?: string }) {
  const [data, setData] = useState<SopGraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setLoading(true); setErr(null); setData(null);
    ingestApi.get<SopGraphResponse>(`/${jobId}/graph/`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(String(e?.message ?? e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  // Build the tree(s) rooted at the graph node(s) this canvas node represents.
  const { roots, nodeCount } = useMemo(() => {
    if (!data) return { roots: [] as GraphTreeNode[], nodeCount: 0 };

    const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
    const outBySource = new Map<string, SopGraphEdge[]>();
    for (const e of data.edges) {
      if (!outBySource.has(e.source)) outBySource.set(e.source, []);
      outBySource.get(e.source)!.push(e);
    }

    const isPrecond = (nodeKind ?? "").toLowerCase().includes("precond");
    const stepKey = stepNumber != null ? `step_${stepNumber}` : null;

    let rootIds: string[] = [];
    if (isPrecond) {
      // The preconditions node stands for every pre-section in the SOP.
      rootIds = data.nodes
        .filter((n) => String(n.type).toUpperCase() === "PRE_SECTION")
        .map((n) => n.id);
    } else if (stepKey && nodeById.has(stepKey)) {
      rootIds = [stepKey];
    }
    // Fallback 1: a STEP node identified by its step_number detail.
    if (rootIds.length === 0 && stepNumber != null) {
      const byNum = data.nodes.find(
        (n) => String(n.type).toUpperCase() === "STEP" &&
          String(n.details?.step_number) === String(stepNumber),
      );
      if (byNum) rootIds = [byNum.id];
    }
    // Fallback 2: pre-sections that guard this step.
    if (rootIds.length === 0 && stepKey) {
      rootIds = data.edges
        .filter((e) => e.rel === "GUARDS" && e.target === stepKey)
        .map((e) => e.source);
    }

    let count = 0;
    const visited = new Set<string>();
    const build = (id: string): GraphTreeNode | null => {
      const node = nodeById.get(id);
      if (!node || visited.has(id)) return null;
      visited.add(id);
      count += 1;
      const refs: GraphTreeNode["refs"] = [];
      const children: GraphTreeNode[] = [];
      for (const e of outBySource.get(id) ?? []) {
        if (GRAPH_CONTAINMENT_RELS.has(e.rel)) {
          const child = build(e.target);
          if (child) children.push(child);
        } else {
          refs.push({ rel: e.rel, target: e.target, label: e.label });
        }
      }
      return { node, refs, children };
    };

    const built = Array.from(new Set(rootIds))
      .map((id) => build(id))
      .filter((t): t is GraphTreeNode => t !== null);
    return { roots: built, nodeCount: count };
  }, [data, stepNumber, nodeKind]);

  if (!jobId) return <EmptyState message="No ingestion job linked to this node." />;
  if (loading) return <Spinner />;
  if (err) return <EmptyState message={`Failed to load: ${err}`} />;
  if (!data) return <EmptyState message="No graph data." />;

  const scopeLabel = (nodeKind ?? "").toLowerCase().includes("precond")
    ? "Pre-step exceptions & override rules"
    : stepNumber != null ? `Step ${stepNumber}` : "This node";

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-foreground">{scopeLabel}</span>
        <span className="text-[10px] text-muted-foreground">· knowledge graph</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {nodeCount} node{nodeCount === 1 ? "" : "s"}
        </span>
      </div>

      {roots.length === 0 ? (
        <EmptyState message="No knowledge-graph nodes found for this step." />
      ) : (
        <div className="text-xs leading-tight">
          {roots.map((r, i) => (
            <GraphTreeRow
              key={r.node.id}
              tnode={r}
              guides={[]}
              isLast={i === roots.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One row of the knowledge-graph tree, with ASCII-style connector guides. */
function GraphTreeRow({
  tnode, guides, isLast,
}: {
  tnode: GraphTreeNode;
  /** For each ancestor level: was that ancestor its parent's last child? */
  guides: boolean[];
  isLast: boolean;
}) {
  const type = String(tnode.node.type).toUpperCase();
  const chip = GRAPH_NODE_TONE[type] ?? "bg-slate-100 border-slate-200 text-slate-700";
  const depth = guides.length;

  return (
    <div>
      <div className="flex items-stretch min-h-[28px]">
        {/* vertical guides inherited from ancestors */}
        {guides.map((ancestorLast, i) => (
          <span key={i} className="w-4 shrink-0 relative">
            {!ancestorLast && (
              <span className="absolute left-1.5 top-0 bottom-0 border-l border-border" />
            )}
          </span>
        ))}
        {/* elbow connector into this node */}
        {depth > 0 && (
          <span className="w-4 shrink-0 relative">
            <span className="absolute left-1.5 top-0 h-1/2 border-l border-border" />
            <span className="absolute left-1.5 top-1/2 w-2.5 border-t border-border" />
            {!isLast && (
              <span className="absolute left-1.5 top-1/2 bottom-0 border-l border-border" />
            )}
          </span>
        )}
        {/* node */}
        <div className="flex items-center gap-2 py-1 min-w-0 flex-1">
          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${chip}`}>
            {type}
          </span>
          <span
            className="text-[11px] font-medium text-foreground truncate"
            title={String(tnode.node.label)}
          >
            {String(tnode.node.label)}
          </span>
          {tnode.refs.map((ref, i) => (
            <span
              key={i}
              className="hidden md:inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted/60 border border-border rounded px-1 py-0.5 shrink-0"
              title={`${ref.rel} → ${ref.target}`}
            >
              {ref.rel}
              <ArrowRight className="h-2.5 w-2.5" />
              <span className="font-mono">{ref.target}</span>
            </span>
          ))}
        </div>
      </div>
      {tnode.children.map((c, i) => (
        <GraphTreeRow
          key={c.node.id}
          tnode={c}
          guides={[...guides, isLast]}
          isLast={i === tnode.children.length - 1}
        />
      ))}
    </div>
  );
}

// ── Main ConfigPanel ──────────────────────────────────────────────────────────

export default function ConfigPanel({
  node, onUpdate, onDelete, onClose,
  workflowId, readOnly = false, workflowSops = [],
  onSave, isSaving = false, isDirty = false,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("rules");
  const data = node.data as WorkflowNodeData;
  const catalog = useShapeCatalog();

  const props = (data as unknown as { properties?: Record<string, unknown> }).properties ?? {};
  const attachedRules = (props.sop_rules as AttachedSopRule[] | undefined) ?? [];
  const attachedTools = (props.tool_calls as AttachedTool[] | undefined) ?? [];
  const manualOos = props.manual_out_of_scope === true;
  const manualNa = props.manual_not_applicable === true;

  const sopId = props.sop_id != null ? Number(props.sop_id) : null;
  const stepNumber = props.step_number != null ? Number(props.step_number) : null;

  // Resolve job_id: find the SOP whose audit_sop_id === sopId.
  const jobId = useMemo(() => {
    if (sopId == null) return null;
    return workflowSops.find((s) => s.audit_sop_id === sopId)?.job_id ?? null;
  }, [sopId, workflowSops]);

  const setAttachments = (rules: AttachedSopRule[], tools: AttachedTool[]) =>
    onUpdate(node.id, { properties: { ...props, sop_rules: rules, tool_calls: tools } } as unknown as Partial<WorkflowNodeData>);

  const definitionSlug = (data as unknown as { definitionSlug?: string }).definitionSlug;
  const def = definitionSlug ? catalog.bySlug[definitionSlug] : undefined;
  const isWorkArea = data.nodeType === "workarea";

  const cfg = def
    ? { label: def.label, color: (def.default_style?.stroke as string | undefined) ?? "#6366f1" }
    : NODE_TYPE_CONFIG.workarea;

  const nodeLabel = data.label ?? def?.default_label ?? def?.label ?? "Node";
  const stepQuestion = typeof props.step_question === "string" ? props.step_question : "";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[min(80rem,calc(100vw-2rem))] max-w-none h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <DialogHeader className="flex-none px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            {isWorkArea ? (
              <Layers className="h-5 w-5 shrink-0" style={{ color: cfg.color }} />
            ) : (
              <div className="h-4 w-4 rounded-full shrink-0"
                style={{ background: cfg.color, boxShadow: `0 0 0 3px ${cfg.color}22` }} />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {nodeLabel}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {cfg.label}
                {stepNumber != null ? ` · Step ${stepNumber}` : ""}
                {stepQuestion ? ` · ${stepQuestion.slice(0, 80)}${stepQuestion.length > 80 ? "…" : ""}` : ""}
              </p>
            </div>
            {/* Counts */}
            <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ListTree className="h-3 w-3" />{attachedRules.length} rule{attachedRules.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />{attachedTools.length} tool{attachedTools.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Tab bodies ───────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          {activeTab === "rules" && (
            <div className="flex flex-col overflow-hidden h-full">
              <RulesOnlyPanel
              workflowId={workflowId}
              rules={attachedRules}
              tools={attachedTools}
              onChange={setAttachments}
              readOnly={readOnly}
                isWorkArea={isWorkArea}
              />
            </div>
          )}

          {activeTab === "overview" && (
            <OverviewTab
              node={node} def={def} onUpdate={onUpdate} readOnly={readOnly}
              manualOos={manualOos} manualNa={manualNa} props={props}
            />
          )}

          {activeTab === "detail" && (
            <SopDetailTab
              stepDetail={typeof props.step_detail === "string" ? props.step_detail : ""}
              jobId={jobId}
            />
          )}

          {activeTab === "schema" && (
            <SchemaTab rules={attachedRules} />
          )}

          {activeTab === "graph" && (
            <GraphTab
              jobId={jobId}
              stepNumber={stepNumber}
              nodeKind={typeof props.kind === "string" ? props.kind : undefined}
            />
        )}
      </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
      {!readOnly && (
          <div className="flex-none flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => onDelete(node.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              {isWorkArea ? "Delete Work Area & Contents" : "Delete Node"}
            </Button>
            <div className="flex items-center gap-2">
              {onSave && (
          <Button
            size="sm"
                  onClick={() => onSave()}
                  disabled={isSaving || !isDirty}
                  title={isDirty ? "Save all changes" : "No changes to save"}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              )}
              <Button variant={onSave ? "outline" : "default"} size="sm" onClick={onClose}>
                Done
          </Button>
            </div>
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
}
