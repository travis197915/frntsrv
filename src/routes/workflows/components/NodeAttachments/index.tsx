import { Fragment, useMemo, useState } from "react";
import { Plus, FileText, Wrench, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toolPickKey } from "@/utils/nodeAttachments";
import type { AttachedSopRule, AttachedTool } from "@/interfaces/workflows";
import AttachedRuleCard from "./AttachedRuleCard";
import GroupedToolsList from "./GroupedToolsList";
import FullscreenAttachmentPicker from "./HtmlFullscreenPicker";
import CustomRuleForm from "./CustomRuleForm";

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
  const [addingCustom, setAddingCustom] = useState(false);
  // Key of the rule a sub-rule is currently being authored under (or null).
  const [subRuleParent, setSubRuleParent] = useState<string | null>(null);

  const addCustomRule = (rule: AttachedSopRule) => {
    if (readOnly) return;
    let next: AttachedSopRule[];
    if (rule.parent_key) {
      const pIdx = rules.findIndex((r) => r.key === rule.parent_key);
      if (pIdx === -1) {
        next = [...rules, rule];
      } else {
        // Insert right after the parent and all of its existing descendants
        // so the nested block reads top-down.
        const pDepth = rules[pIdx].depth ?? 0;
        let ins = pIdx + 1;
        while (ins < rules.length && (rules[ins].depth ?? 0) > pDepth) ins += 1;
        next = [...rules.slice(0, ins), rule, ...rules.slice(ins)];
      }
    } else {
      next = [...rules, rule];
    }
    onChange(
      next.map((r, i) => ({ ...r, ordering: i })),
      tools,
    );
    setSubRuleParent(null);
  };

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

  const updateRuleContext = (key: string, context: string) => {
    if (readOnly) return;
    onChange(
      rules.map((r) =>
        r.key === key ? { ...r, additional_context: context } : r,
      ),
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

  // Indentation level per rule. Prefer the authoritative `depth` from the
  // backend; otherwise derive nesting from the hierarchical rule id
  // (e.g. RULE-000-000 -> RULE-000-000-001). Depths are normalised so the
  // shallowest decision sits flush-left.
  const depthByKey = useMemo(() => {
    const raw = new Map<string, number>();
    for (const r of rules) {
      if (r.source !== "decision") {
        raw.set(r.key, 0);
        continue;
      }
      if (typeof r.depth === "number") {
        raw.set(r.key, r.depth);
      } else {
        const segs = (r.subrule_id || "").split("-").filter(Boolean).length;
        // "RULE-000-000" => 3 segments, treat as level 0.
        raw.set(r.key, segs > 3 ? segs - 3 : 0);
      }
    }
    const decisionDepths = rules
      .filter((r) => r.source === "decision")
      .map((r) => raw.get(r.key) ?? 0);
    const min = decisionDepths.length ? Math.min(...decisionDepths) : 0;
    const out = new Map<string, number>();
    for (const r of rules) {
      const base = raw.get(r.key) ?? 0;
      out.set(r.key, r.source === "decision" ? Math.max(0, base - min) : 0);
    }
    return out;
  }, [rules]);

  return (
    <>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Rules
        </label>
        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 min-w-0 px-2 text-[11px]"
              onClick={() => setAddingCustom((v) => !v)}
            >
              <Wand2 className="h-3 w-3 mr-1 shrink-0" />
              Custom rule
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 min-w-0 px-2 text-[11px]"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1 shrink-0" />
            {readOnly ? "View rules & tools" : "Pick rules & tools"}
          </Button>
        </div>

        {addingCustom && !readOnly && (
          <CustomRuleForm
            ordering={rules.length}
            onAdd={addCustomRule}
            onClose={() => setAddingCustom(false)}
          />
        )}

        {rules.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No rules attached.
            {readOnly
              ? " Open the viewer to browse available SOP rules."
              : ' Click "Pick" to select lines from any SOP linked to this workflow.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rules.map((r, i) => {
              const rDepth = depthByKey.get(r.key) ?? 0;
              return (
                <Fragment key={r.key}>
                  <AttachedRuleCard
                    rule={r}
                    depth={rDepth}
                    allRules={rules}
                    depthByKey={depthByKey}
                    readOnly={readOnly}
                    onRemove={readOnly ? undefined : removeRule}
                    onMoveUp={
                      readOnly || i === 0 ? undefined : () => moveRule(r.key, "up")
                    }
                    onMoveDown={
                      readOnly || i >= rules.length - 1
                        ? undefined
                        : () => moveRule(r.key, "down")
                    }
                    onContextChange={readOnly ? undefined : updateRuleContext}
                    onAddSubRule={
                      readOnly
                        ? undefined
                        : (key) => {
                            setAddingCustom(false);
                            setSubRuleParent((cur) => (cur === key ? null : key));
                          }
                    }
                  />
                  {subRuleParent === r.key && !readOnly && (
                    <li style={{ marginLeft: (rDepth + 1) * 16 }}>
                      <CustomRuleForm
                        ordering={rules.length}
                        parentKey={r.key}
                        depth={rDepth + 1}
                        parentLabel={
                          r.subrule_id || r.section_label || `Rule ${i + 1}`
                        }
                        onAdd={addCustomRule}
                        onClose={() => setSubRuleParent(null)}
                      />
                    </li>
                  )}
                </Fragment>
              );
            })}
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
