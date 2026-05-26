import { useState } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { DECISION_TONE } from "@/utils/nodeAttachments";
import type { AttachedSopRule } from "@/interfaces/workflows";

interface AttachedRuleCardProps {
  rule: AttachedSopRule;
  onRemove: (key: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function AttachedRuleCard({
  rule,
  onRemove,
  onMoveUp,
  onMoveDown,
}: AttachedRuleCardProps) {
  const [showCtx, setShowCtx] = useState(false);
  return (
    <li className="border border-border rounded p-2 bg-muted/30">
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
        <button
          type="button"
          onClick={() => onRemove(rule.key)}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}
