import { Wrench, Link2 } from "lucide-react";
import { toolPickKey } from "@/utils/nodeAttachments";
import type { AttachableSopRule, AttachableTool, AttachedSopRule } from "@/interfaces/workflows";

interface ToolsTabProps {
  filteredTools: AttachableTool[];
  picked: Set<string>;
  pickedToolToRule: Map<string, string>;
  focusedRefKey: string | null;
  ruleByKey: Map<string, AttachableSopRule>;
  readOnly?: boolean;
  onToggleTool: (toolKey: string, ruleKey: string | null) => void;
  /** Custom (non-SOP) rules already on this node — the "Source" jump-to-HTML
   * focus flow only exists for SOP rules (SopRulesSidebar), so a custom rule
   * needs its own way to become the tool-link target here. */
  customRules?: AttachedSopRule[];
  onFocusRef?: (key: string | null) => void;
}

export default function ToolsTab({
  filteredTools,
  picked,
  pickedToolToRule,
  focusedRefKey,
  ruleByKey,
  readOnly = false,
  onToggleTool,
  customRules = [],
  onFocusRef,
}: ToolsTabProps) {
  const focusedCustomRule = focusedRefKey
    ? customRules.find((r) => r.key === focusedRefKey)
    : undefined;
  return (
    <div>
      {customRules.length > 0 && onFocusRef && !readOnly && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <label className="text-[11px] text-muted-foreground shrink-0">
            Link new tools to a custom rule on this node:
          </label>
          <select
            value={focusedCustomRule ? focusedRefKey ?? "" : ""}
            onChange={(e) => onFocusRef(e.target.value || null)}
            className="flex-1 h-7 rounded-md border border-input bg-background px-1.5 text-[11px]"
          >
            <option value="">(none — unscoped tool)</option>
            {customRules.map((r) => (
              <option key={r.key} value={r.key}>
                {r.subrule_id || r.section_label || r.condition?.slice(0, 40) || r.key}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Hint banner when a rule is focused — explains the rule_binding linkage */}
      {focusedRefKey && (ruleByKey.has(focusedRefKey) || focusedCustomRule) && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 text-[11px] text-indigo-900 flex items-center gap-2">
          <Wrench className="h-3 w-3" />
          Tools you tick now will be linked to rule
          <code className="px-1 py-0.5 rounded bg-white/60 border border-indigo-200 text-[10px]">
            {focusedRefKey}
          </code>
          {focusedCustomRule
            ? "(custom rule — stored via a reserved args_template key) on save."
            : "(NodeToolBinding.rule_binding) on save."}
        </div>
      )}
      <div className="divide-y divide-border">
        {filteredTools.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No tools available. Wait for the agent_tools registry to seed (or
            attach runtime API agents via the workflow context panel).
          </div>
        )}
        {filteredTools.map((t) => {
          const pickKey = toolPickKey(t);
          const isSelected = picked.has(pickKey);
          const isLangchain = (t.tool_kind || t.kind) === "langchain";
          return (
            <button
              key={pickKey}
              type="button"
              disabled={readOnly}
              onClick={() =>
                onToggleTool(
                  pickKey,
                  focusedRefKey && (ruleByKey.has(focusedRefKey) || focusedCustomRule)
                    ? focusedRefKey
                    : null,
                )
              }
              className={`w-full text-left px-4 py-2 transition-colors flex items-start gap-3 ${isSelected ? "bg-blue-50/40" : ""} ${readOnly ? "opacity-80 cursor-default" : "hover:bg-muted/40"}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="mt-0.5 h-3.5 w-3.5 rounded border-input shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isLangchain
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isLangchain ? "LANGCHAIN" : t.method || "AGENT"}
                  </span>
                  <span className="text-xs font-medium truncate">
                    {t.display_name || t.name || "(unnamed)"}
                  </span>
                  {pickedToolToRule.has(pickKey) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      for {pickedToolToRule.get(pickKey)}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {t.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                  {t.invoke_url || t.url}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
