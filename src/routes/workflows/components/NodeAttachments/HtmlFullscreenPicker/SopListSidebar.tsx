import { BookOpen, ChevronRight } from "lucide-react";
import { isRulePickKey } from "@/utils/nodeAttachments";
import type { WorkflowAttachable } from "@/lib/workflowsApi";
import type { SopEntry } from "./types";

interface Props {
  availableSops: SopEntry[];
  picked: Set<string>;
  keyToSopId: Map<string, number>;
  data: WorkflowAttachable | null;
  err: string | null;
  onSelectSop: (id: number) => void;
}

export default function SopListSidebar({
  availableSops,
  picked,
  keyToSopId,
  data,
  err,
  onSelectSop,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
        Select a SOP below to browse its rules alongside the source document.
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {err && (
          <div className="p-4 text-sm text-destructive">Failed: {err}</div>
        )}
        {!data && !err && (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted-foreground/20 animate-pulse" />
            ))}
          </div>
        )}
        {data && availableSops.length === 0 && (
          <div className="p-8 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No SOPs attached to this workflow.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Attach an SOP from the workflow settings first.
            </p>
          </div>
        )}
          {data && (
          <div className="divide-y divide-border">
            {availableSops.map((sop) => {
              const sopPickedCount = Array.from(picked).filter(
                (k) => isRulePickKey(k) && keyToSopId.get(k) === sop.sop_id,
              ).length;

              return (
                <button
                  key={sop.sop_id}
                  type="button"
                  onClick={() => onSelectSop(sop.sop_id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-indigo-50/60 transition-colors flex items-start gap-3 group"
                >
                  <div className="h-8 w-8 rounded-md bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-200 transition-colors">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{sop.title}</p>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    {sop.narrative && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                        {sop.narrative}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {sop.ruleCount !== null ? (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {sop.ruleCount} rules
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border animate-pulse">
                          rules
                        </span>
                      )}
                      {sopPickedCount > 0 && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {sopPickedCount} selected
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
