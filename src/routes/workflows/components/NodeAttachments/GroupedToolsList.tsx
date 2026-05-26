import { useMemo } from "react";
import { X } from "lucide-react";
import { toolPickKey } from "@/utils/nodeAttachments";
import type { AttachedSopRule, AttachedTool } from "@/interfaces/workflows";

interface GroupedToolsListProps {
  tools: AttachedTool[];
  rules: AttachedSopRule[];
  onRemove: (key: string) => void;
}

export default function GroupedToolsList({
  tools,
  rules,
  onRemove,
}: GroupedToolsListProps) {
  const ruleLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rules) {
      m.set(r.key, r.section_label || r.key);
    }
    return m;
  }, [rules]);

  // Preserve insertion order of unique group keys so the list stays stable
  // across re-renders.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byKey = new Map<string, AttachedTool[]>();
    for (const t of tools) {
      const groupKey = t.rule_key || "__other__";
      if (!byKey.has(groupKey)) {
        byKey.set(groupKey, []);
        order.push(groupKey);
      }
      byKey.get(groupKey)!.push(t);
    }
    return order.map((key) => ({
      key,
      label:
        key === "__other__"
          ? "Other"
          : ruleLabelByKey.get(key) || `Rule ${key}`,
      tools: byKey.get(key)!,
    }));
  }, [tools, ruleLabelByKey]);

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.key} className="space-y-1">
          <p
            className={`text-[10px] uppercase tracking-wide font-semibold ${
              group.key === "__other__"
                ? "text-muted-foreground"
                : "text-indigo-700"
            }`}
          >
            {group.label}
            <span className="ml-1.5 text-muted-foreground font-normal lowercase">
              {group.tools.length} tool{group.tools.length === 1 ? "" : "s"}
            </span>
          </p>
          <ul className="space-y-1.5">
            {group.tools.map((t) => {
              const pickKey = toolPickKey(t);
              const isLangchain = (t.tool_kind || "api_agent") === "langchain";
              return (
                <li
                  key={pickKey}
                  className="border border-border rounded p-2 bg-muted/30 flex items-center gap-2"
                >
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isLangchain
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isLangchain ? "LC" : t.method || "AGENT"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">
                      {t.display_name || t.name || "(unnamed)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {t.url || t.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(pickKey)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
