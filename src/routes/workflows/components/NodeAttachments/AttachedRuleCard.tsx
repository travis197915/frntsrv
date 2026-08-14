import { useState } from "react";
import { X, ChevronUp, ChevronDown, NotebookPen, ListPlus, Ban, Eye, CircleSlash, CircleDot } from "lucide-react";
import { DECISION_TONE } from "@/utils/nodeAttachments";
import type { AttachedSopRule } from "@/interfaces/workflows";
import AdditionalContextDialog from "./AdditionalContextDialog";

interface AttachedRuleCardProps {
  rule: AttachedSopRule;
  onRemove?: (key: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Persist a new value of `rule.additional_context` for this rule. */
  onContextChange?: (key: string, context: string) => void;
  /** Toggle the manual out-of-scope flag for this rule / sub-rule / sub-sub-rule. */
  onToggleOutOfScope?: (key: string, next: boolean) => void;
  /** Toggle the manual not-applicable flag (non-scoring gate; skipped in execution). */
  onToggleNotApplicable?: (key: string, next: boolean) => void;
  /** Open the inline form to add a sub-rule nested under this rule. */
  onAddSubRule?: (parentKey: string) => void;
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
  onToggleNotApplicable,
  onAddSubRule,
  readOnly = false,
  depth = 0,
  allRules,
  depthByKey,
}: AttachedRuleCardProps) {
  const [showCtx, setShowCtx] = useState(false);
  const [ctxDialog, setCtxDialog] = useState(false);
  const hasContext = !!(rule.additional_context ?? "").trim();
  // `is_out_of_scope` is the effective flag the backend recomputes (SOP-derived
  // OR manual, minus any force-in-scope override). Drive the UI off it so an
  // ingestion-flagged out-of-scope rule can be toggled back into scope too.
  const outOfScope = !!rule.is_out_of_scope;
  // Not-applicable is a SEPARATE scope axis from out-of-scope: a non-scoring
  // routing gate that the engine skips deterministically (renders NOT_APPLICABLE)
  // without ever producing a finding. Purely driven by this toggle.
  const notApplicable = !!rule.manual_not_applicable;
  return (
    <li
      style={{ marginLeft: depth > 0 ? depth * 16 : undefined }}
      className={`border rounded p-2 ${
        depth > 0 ? "border-l-2 border-l-indigo-300 border-border/60" : "border-border"
      } ${
        notApplicable
          ? "bg-amber-50/60 border-amber-200"
          : outOfScope
            ? "bg-rose-50/60 border-rose-200"
            : "bg-muted/30"
      }`}
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
            {notApplicable && (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                Not applicable
              </span>
            )}
            {hasContext && (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                Modified
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

          {/* Original (SOP) vs Updated (auditor context) — always visible per rule
              when the rule has been modified, so the change is auditable inline. */}
          {hasContext && (
            <div className="mt-2 rounded border border-indigo-200 overflow-hidden">
              <div className="px-2 py-1 bg-slate-100/70 border-b border-slate-200">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Original rule (from SOP)
                </span>
                {rule.condition && (
                  <p className="text-[11px] leading-snug text-slate-600">
                    <span className="text-muted-foreground">If </span>
                    {rule.condition}
                  </p>
                )}
                {rule.action && (
                  <p className="text-[11px] leading-snug text-slate-600">
                    <span className="text-muted-foreground">Then </span>
                    {rule.action}
                  </p>
                )}
                {!rule.condition && !rule.action && (
                  <p className="text-[11px] leading-snug italic text-muted-foreground">
                    {rule.section_label || rule.key}
                  </p>
                )}
              </div>
              <div className="px-2 py-1 bg-indigo-50/50 border-l-2 border-l-indigo-400">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-600">
                  Updated — auditor context added
                </span>
                <p className="text-[11px] leading-snug whitespace-pre-wrap text-indigo-900">
                  {rule.additional_context}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Labeled action bar — explicit buttons instead of tiny icons */}
      {(onToggleOutOfScope || onToggleNotApplicable || onRemove || onAddSubRule || onContextChange || hasContext) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {onToggleNotApplicable && (
            <button
              type="button"
              onClick={() => onToggleNotApplicable(rule.key, !notApplicable)}
              aria-pressed={notApplicable}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                notApplicable
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
              }`}
              title={
                notApplicable
                  ? "Make this step applicable again (it will be evaluated)"
                  : "Mark this step not applicable — the engine skips it (NOT_APPLICABLE), never a finding"
              }
            >
              {notApplicable ? (
                <>
                  <CircleDot className="h-3 w-3" />
                  Mark applicable
                </>
              ) : (
                <>
                  <CircleSlash className="h-3 w-3" />
                  Mark not applicable
                </>
              )}
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
