import { X, BookOpen, Wrench } from "lucide-react";
import SearchInput from "@/components/SearchInput";
import { cn } from "@/utils/utils";
import type { ActiveTab } from "./types";

interface Props {
  readOnly: boolean;
  activeTab: ActiveTab;
  sopRulesCount?: number;
  toolCallsCount?: number;
  query: string;
  onClose: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onQueryChange: (q: string) => void;
}

function tabCls(active: boolean) {
  return cn(
    "relative px-3.5 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs font-medium transition-all",
    active
      ? "bg-white text-foreground shadow-md ring-1 ring-black/5 z-10 dark:bg-zinc-600 dark:text-zinc-50 dark:ring-white/10"
      : "text-muted-foreground hover:text-foreground",
  );
}

export default function PickerHeader({
  readOnly,
  activeTab,
  sopRulesCount,
  toolCallsCount,
  query,
  onClose,
  onTabChange,
  onQueryChange,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
      <button
        onClick={onClose}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground shrink-0"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {readOnly ? "Viewing" : "Editing"} node attachments
        </div>
        <h2 className="text-sm font-semibold truncate">
          {readOnly ? "View rules & tools" : "Attach rules & tools to this node"}
        </h2>
      </div>

      <div
        role="tablist"
        aria-label="Attachment type"
        className="inline-flex rounded-lg bg-muted p-1 gap-0.5 shrink-0 dark:bg-zinc-900/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "rules"}
          onClick={() => onTabChange("rules")}
          className={tabCls(activeTab === "rules")}
        >
          <BookOpen className="h-3 w-3" />
          SOP Rules
          {sopRulesCount !== undefined && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              ({sopRulesCount})
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tools"}
          onClick={() => onTabChange("tools")}
          className={tabCls(activeTab === "tools")}
        >
          <Wrench className="h-3 w-3" />
          Tool Calls
          {toolCallsCount !== undefined && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              ({toolCallsCount})
            </span>
          )}
        </button>
      </div>

      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={activeTab === "rules" ? "Search rules, sections, codes…" : "Search tools…"}
        wrapperClassName="w-64 shrink-0"
        className="h-8 text-xs"
      />
    </div>
  );
}
