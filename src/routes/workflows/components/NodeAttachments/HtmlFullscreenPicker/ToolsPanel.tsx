import ToolsTab from "../RulePicker/ToolsTab";
import type { AttachableSopRule, WorkflowAttachable } from "@/lib/workflowsApi";
import type { AttachableTool } from "@/interfaces/workflows";

interface Props {
  data: WorkflowAttachable | null;
  err: string | null;
  filteredTools: AttachableTool[];
  picked: Set<string>;
  pickedToolToRule: Map<string, string>;
  focusedRefKey: string | null;
  ruleByKey: Map<string, AttachableSopRule>;
  readOnly: boolean;
  onToggleTool: (toolKey: string, ruleKey: string | null) => void;
}

export default function ToolsPanel({
  data,
  err,
  filteredTools,
  picked,
  pickedToolToRule,
  focusedRefKey,
  ruleByKey,
  readOnly,
  onToggleTool,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {err && (
        <div className="px-4 py-3 text-sm text-destructive">{err}</div>
      )}
      {!data && !err && (
        <div className="p-6 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-muted animate-pulse" />
          ))}
        </div>
      )}
      {data && (
        <ToolsTab
          filteredTools={filteredTools}
          picked={picked}
          pickedToolToRule={pickedToolToRule}
          focusedRefKey={focusedRefKey}
          ruleByKey={ruleByKey}
          readOnly={readOnly}
          onToggleTool={onToggleTool}
        />
      )}
    </div>
  );
}
