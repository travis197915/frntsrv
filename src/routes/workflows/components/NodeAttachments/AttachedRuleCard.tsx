import { useState } from "react";
import { X, ChevronUp, ChevronDown, NotebookPen, ListPlus, Ban, Eye, Pencil, Unlink, Clock } from "lucide-react";
import { DECISION_TONE } from "@/utils/nodeAttachments";
import type { AttachedSopRule } from "@/interfaces/workflows";
import AdditionalContextDialog from "./AdditionalContextDialog";
import EditRuleDialog from "./EditRuleDialog";

interface AttachedRuleCardProps {
  rule: AttachedSopRule;
  onRemove?: (key: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Persist a new value of `rule.additional_context` for this rule. */
  onContextChange?: (key: string, context: string) => void;
  /** Toggle the manual out-of-scope flag for this rule / sub-rule / sub-sub-rule. */
  onToggleOutOfScope?: (key: string, next: boolean) => void;
  /** Open the inline form to add a sub-rule nested under this rule. */
  onAddSubRule?: (parentKey: string) => void;
  /** Persist edited condition/action text for this rule. */
  onEditRule?: (key: string, condition: string, action: string) => void;
  /** True when this rule has an open, unreviewed canvas rule-change proposal
   *  — the rule shown is still the last-approved content; edit/remove are
   *  disabled until the pending change is approved or rejected. */
  pending?: boolean;
  readOnly?: boolean;
  /** Nesting level used for indentation (0 = top-level rule). */
  depth?: number;
  /** Every rule on this node — shown in the dialog's "Node rules" tab. */
  allRules?: AttachedSopRule[];
  /** Indentation level per rule key, for the dialog's tree. */
  depthByKey?: Map<string, number>;
}

export default function AttachedRuleCard({
  rule,
  onRemove,
  onMoveUp,
  onMoveDown,
  onContextChange,
  onToggleOutOfScope,
  onAddSubRule,
  onEditRule,
  pending = false,
  readOnly = false,
  depth = 0,
  allRules,
  depthByKey,
}: AttachedRuleCardProps) {
  const [showCtx, setShowCtx] = useState(false);
  const [ctxDialog, setCtxDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const hasContext = !!(rule.additional_context ?? "").trim();
  const isOrphaned = !!rule.orphaned_from_rule_key;
  // `is_out_of_scope` is the effective flag the backend recomputes (SOP-derived
  // OR manual, minus any force-in-scope override). Drive the UI off it so an
  // ingestion-flagged out-of-scope rule can be toggled back into scope too.
  const outOfScope = !!rule.is_out_of_scope;
  return (
    <li
      style={{ marginLeft: depth > 0 ? depth * 16 : undefined }}
      className={`border rounded p-2 ${
        depth > 0 ? "border-l-2 border-l-indigo-300 border-border/60" : "border-border"
      } ${outOfScope ? "bg-rose-50/60 border-rose-200" : "bg-muted/30"}`}
    >
      <div className="flex items-start gap-2">
        {/* Sequence badge + reorder controls */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold leading-none select-none">
            {rule.ordering + 1}
          </span>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move rule up"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move rule down"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span
              className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[rule.decision_type] || "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              {rule.decision_type || "—"}
            </span>
            {rule.subrule_id && (
              <span className="font-mono text-[10px] px-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {rule.subrule_id}
              </span>
            )}
            {outOfScope && (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                Out of scope
              </span>
            )}
            {pending && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-300"
                title="An edit to this rule is awaiting review — the content shown is still the last-approved version."
              >
                <Clock className="h-2.5 w-2.5" />
                Pending review
              </span>
            )}
            {isOrphaned && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
                title={`Was a SOP rule (${rule.orphaned_from_rule_key}); the source rule was removed by a newer SOP version, so your edit was preserved here as a workflow-only rule. Review recommended.`}
              >
                <Unlink className="h-2.5 w-2.5" />
                Disconnected from SOP
              </span>
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              {rule.section_label}
            </span>
            {(rule.codes ?? []).slice(0, 3).map((c) => (
              <span
                key={c}
                className="font-mono text-[10px] px-1 rounded bg-slate-100 text-slate-700"
              >
                {c}
              </span>
            ))}
          </div>
          {rule.condition && (
            <p className="text-[11px] leading-snug">
              <span className="text-muted-foreground">If </span>
              {rule.condition}
            </p>
          )}
          {rule.action && (
            <p className="text-[11px] leading-snug">
              <span className="text-muted-foreground">Then </span>
              {rule.action}
            </p>
          )}
          {rule.section_narrative && (
            <>
              <button
                type="button"
                onClick={() => setShowCtx((v) => !v)}
                className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-700"
              >
                {showCtx ? "Hide context" : "Why this rule?"}
              </button>
              {showCtx && (
                <p className="mt-1 text-[11px] leading-snug italic text-muted-foreground border-l-2 border-indigo-300 pl-2">
                  {rule.section_narrative}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Labeled action bar — explicit buttons instead of tiny icons */}
      {(onToggleOutOfScope || onRemove || onAddSubRule || onContextChange || hasContext || onEditRule) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {onEditRule && (
            <button
              type="button"
              onClick={() => setEditDialog(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[11px] font-medium transition-colors"
              title="Edit this rule's condition/action"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
          {onToggleOutOfScope && (
            <button
              type="button"
              onClick={() => onToggleOutOfScope(rule.key, !outOfScope)}
              aria-pressed={outOfScope}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                outOfScope
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
              }`}
              title={
                outOfScope
                  ? "Bring this rule back in scope (overrides the SOP flag)"
                  : "Mark this rule out of scope"
              }
            >
              {outOfScope ? (
                <>
                  <Eye className="h-3 w-3" />
                  Mark in scope
                </>
              ) : (
                <>
                  <Ban className="h-3 w-3" />
                  Mark out of scope
                </>
              )}
            </button>
          )}
          {onAddSubRule && (
            <button
              type="button"
              onClick={() => onAddSubRule(rule.key)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-[11px] font-medium transition-colors"
              title="Add a sub-rule under this rule"
            >
              <ListPlus className="h-3 w-3" />
              Add sub-rule
            </button>
          )}
          {(onContextChange || hasContext) && (
            <button
              type="button"
              onClick={() => setCtxDialog(true)}
              className={`relative inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                hasContext
                  ? "border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={
                hasContext
                  ? "Edit additional context for the agent"
                  : "Add additional context for the agent"
              }
            >
              <NotebookPen className="h-3 w-3" />
              {hasContext ? "Edit context" : "Add context"}
              {hasContext && (
                <span
                  className="ml-0.5 h-1.5 w-1.5 rounded-full bg-indigo-500"
                  aria-hidden="true"
                />
              )}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(rule.key)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 text-[11px] font-medium transition-colors ml-auto"
              title="Exclude (remove) this rule from the node"
            >
              <X className="h-3 w-3" />
              Exclude rule
            </button>
          )}
        </div>
      )}

      {onEditRule && (
        <EditRuleDialog
          open={editDialog}
          ruleLabel={rule.subrule_id || rule.section_label || rule.key}
          initialCondition={rule.condition}
          initialAction={rule.action}
          isSopBacked={!rule.is_custom}
          readOnly={readOnly}
          onClose={() => setEditDialog(false)}
          onSave={(condition, action) => onEditRule(rule.key, condition, action)}
        />
      )}

      <AdditionalContextDialog
        open={ctxDialog}
        ruleLabel={rule.subrule_id || rule.section_label || rule.key}
        ruleCondition={rule.condition}
        initialContext={rule.additional_context ?? ""}
        readOnly={readOnly || !onContextChange}
        rules={allRules ?? [rule]}
        depthByKey={depthByKey}
        activeKey={rule.key}
        onClose={() => setCtxDialog(false)}
        onSave={(text) => onContextChange?.(rule.key, text)}
      />
    </li>
  );
}
