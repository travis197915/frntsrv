import { useState } from "react";
import { Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AttachedSopRule } from "@/interfaces/workflows";

const DECISION_TYPES = [
  "ALLOW",
  "DENY",
  "BYPASS",
  "PEND",
  "REFER",
  "WAIVE",
  "STOP",
  "SYSTEM",
  "NOTE",
  "CONDITIONAL",
] as const;

function newCustomKey(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `custom:${rand}`;
}

interface CustomRuleFormProps {
  /** Position the new rule will occupy (appended to the end of the list). */
  ordering: number;
  onAdd: (rule: AttachedSopRule) => void;
  onClose: () => void;
  /** When set, the new rule nests under this parent rule key (a sub-rule). */
  parentKey?: string | null;
  /** Nesting depth for the new rule (parent depth + 1). */
  depth?: number;
  /** Human label of the parent rule, shown in the sub-rule form header. */
  parentLabel?: string;
}

export default function CustomRuleForm({
  ordering,
  onAdd,
  onClose,
  parentKey = null,
  depth = 0,
  parentLabel,
}: CustomRuleFormProps) {
  const isSubRule = Boolean(parentKey);
  const [label, setLabel] = useState("");
  const [decisionType, setDecisionType] = useState<string>("CONDITIONAL");
  const [condition, setCondition] = useState("");
  const [action, setAction] = useState("");
  const [context, setContext] = useState("");

  const canSave = condition.trim().length > 0 || action.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const rule: AttachedSopRule = {
      key: newCustomKey(),
      ordering,
      sop_id: 0,
      sop_title: "Custom",
      source: "decision",
      section_label: label.trim() || (isSubRule ? "Custom sub-rule" : "Custom rule"),
      subrule_id: undefined,
      depth,
      parent_key: parentKey,
      condition: condition.trim(),
      action: action.trim(),
      decision_type: decisionType,
      codes: [],
      is_custom: true,
      ...(context.trim() ? { additional_context: context.trim() } : {}),
    };
    onAdd(rule);
    onClose();
  };

  return (
    <div className="rounded-md border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500">
          <Wand2 className="h-3.5 w-3.5" />
          {isSubRule
            ? `New sub-rule${parentLabel ? ` under ${parentLabel}` : ""}`
            : "New custom rule"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Manual override)"
          className="text-xs h-8 flex-1"
          autoFocus
        />
        <select
          value={decisionType}
          onChange={(e) => setDecisionType(e.target.value)}
          className="text-[11px] h-8 px-1.5 rounded-md border border-input bg-background"
        >
          {DECISION_TYPES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">If (condition)</label>
        <Textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="When does this rule apply?"
          className="min-h-[56px] resize-none text-xs"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">Then (action)</label>
        <Textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="What should the auditor / agent do?"
          className="min-h-[56px] resize-none text-xs"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">
          Additional context (optional)
        </label>
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Extra guidance fed to the agent at runtime."
          className="min-h-[44px] resize-none text-xs"
        />
      </div>

      <div className="flex justify-end gap-2 pt-0.5">
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" className="h-7 text-[11px]" onClick={handleSave} disabled={!canSave}>
          {isSubRule ? "Add sub-rule" : "Add rule"}
        </Button>
      </div>
    </div>
  );
}
