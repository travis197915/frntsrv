import { ChevronLeft } from "lucide-react";
import RulesTab from "../RulePicker/RulesTab";
import type { AttachableExclusion, WorkflowAttachable } from "@/lib/workflowsApi";
import type { SopGroup } from "@/interfaces/workflows";
import type { SopExclusionTargetKind } from "@/interfaces/sop";
import type { SopEntry } from "./types";

interface Props {
  sopId: number;
  sopMeta: SopEntry | null;
  selectedInSop: number;
  data: WorkflowAttachable | null;
  rulesLoading?: boolean;
  groupedBySop: SopGroup[];
  picked: Set<string>;
  pickedSequences: Map<string, number>;
  exclusionByKey: Map<string, AttachableExclusion>;
  focusedRefKey: string | null;
  busyRuleKey: string | null;
  readOnly: boolean;
  onBack: () => void;
  onToggleRule: (key: string) => void;
  onToggleExclusion: (
    sopId: number,
    kind: SopExclusionTargetKind,
    key: string,
    on: boolean,
    busyRowKey?: string,
  ) => Promise<void>;
  onFocusRef: (key: string | null) => void;
}

export default function SopRulesSidebar({
  sopId,
  sopMeta,
  selectedInSop,
  data,
  rulesLoading = false,
  groupedBySop,
  picked,
  pickedSequences,
  exclusionByKey,
  focusedRefKey,
  busyRuleKey,
  readOnly,
  onBack,
  onToggleRule,
  onToggleExclusion,
  onFocusRef,
}: Props) {
  return (
    <>
      <div className="px-3 py-2 border-b border-border bg-indigo-50/60 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-indigo-100 text-indigo-700 shrink-0"
          title="Back to SOP list"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-900 truncate">
            {sopMeta?.title ?? `SOP #${sopId}`}
          </p>
          {selectedInSop > 0 && (
            <p className="text-[10px] text-emerald-700">
              {selectedInSop} rule{selectedInSop === 1 ? "" : "s"} selected
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {rulesLoading || !data ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <RulesTab
            groupedBySop={groupedBySop}
            availableSopsCount={1}
            picked={picked}
            pickedSequences={pickedSequences}
            exclusionByKey={exclusionByKey}
            focusedRefKey={focusedRefKey}
            busyRuleKey={busyRuleKey}
            readOnly={readOnly}
            onToggleRule={onToggleRule}
            onToggleExclusion={onToggleExclusion}
            onFocusRef={onFocusRef}
          />
        )}
      </div>
    </>
  );
}
