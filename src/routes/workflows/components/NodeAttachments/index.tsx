import { useMemo, useState } from "react";
import { Plus, FileText, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toolPickKey } from "@/utils/nodeAttachments";
import type { AttachedSopRule, AttachedTool } from "@/interfaces/workflows";
import AttachedRuleCard from "./AttachedRuleCard";
import GroupedToolsList from "./GroupedToolsList";
import FullscreenAttachmentPicker from "./HTMLFullscreenPicker";

interface NodeAttachmentsProps {
  workflowId: string;
  rules: AttachedSopRule[];
  tools: AttachedTool[];
  onChange: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
  readOnly?: boolean;
}

export default function NodeAttachments({
  workflowId,
  rules,
  tools,
  onChange,
  readOnly = false,
}: NodeAttachmentsProps) {
  const [open, setOpen] = useState(false);

  const removeRule = (key: string) => {
    if (readOnly) return;
    onChange(
      rules.filter((r) => r.key !== key),
      tools,
    );
  };
  const removeTool = (key: string) => {
    if (readOnly) return;
    onChange(
      rules,
      tools.filter((t) => toolPickKey(t) !== key),
    );
  };

  const moveRule = (key: string, dir: "up" | "down") => {
    if (readOnly) return;
    const idx = rules.findIndex((r) => r.key === key);
    if (idx === -1) return;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= rules.length) return;
    const next = [...rules];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(
      next.map((r, i) => ({ ...r, ordering: i })),
      tools,
    );
  };

  const selectedKeys = useMemo(
    () =>
      new Set<string>([
        ...rules.map((r) => r.key).filter(Boolean),
        ...tools.map((t) => toolPickKey(t)).filter(Boolean),
      ]),
    [rules, tools],
  );

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            SOP Rules
          </label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {readOnly ? "View rules & tools" : "Pick rules & tools"}
          </Button>
        </div>

        {rules.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No rules attached.
            {readOnly
              ? " Open the viewer to browse available SOP rules."
              : ' Click "Pick" to select lines from any SOP linked to this workflow.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rules.map((r, i) => (
              <AttachedRuleCard
                key={r.key}
                rule={r}
                onRemove={readOnly ? undefined : removeRule}
                onMoveUp={
                  readOnly || i === 0 ? undefined : () => moveRule(r.key, "up")
                }
                onMoveDown={
                  readOnly || i >= rules.length - 1
                    ? undefined
                    : () => moveRule(r.key, "down")
                }
              />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Wrench className="h-3 w-3" />
          Tool Calls
        </label>
        {tools.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No tools attached.
          </p>
        ) : (
          <GroupedToolsList
            tools={tools}
            rules={rules}
            onRemove={readOnly ? undefined : removeTool}
          />
        )}
      </div>

      {open && (
        <FullscreenAttachmentPicker
          workflowId={workflowId}
          selectedKeys={selectedKeys}
          existingRules={rules}
          readOnly={readOnly}
          onClose={() => setOpen(false)}
          onSave={(r, t) => onChange(r, t)}
        />
      )}
    </>
  );
}
