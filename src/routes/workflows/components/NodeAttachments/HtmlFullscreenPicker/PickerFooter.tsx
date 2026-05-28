import { Button } from "@/components/ui/button";
import type { AttachableExclusion } from "@/lib/workflowsApi";

interface Props {
  ruleCount: number;
  toolCount: number;
  exclusions?: AttachableExclusion[];
  readOnly: boolean;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function PickerFooter({
  ruleCount,
  toolCount,
  exclusions,
  readOnly,
  canSave,
  onClose,
  onSave,
}: Props) {
  const userExclusionCount = exclusions?.filter((e) => e.source === "user").length ?? 0;

  return (
    <div className="px-5 py-3 border-t border-border bg-background flex items-center justify-between shrink-0">
      <p className="text-xs text-muted-foreground">
        <b className="text-foreground">{ruleCount}</b> rule{ruleCount === 1 ? "" : "s"}{" "}
        · <b className="text-foreground">{toolCount}</b> tool{toolCount === 1 ? "" : "s"} selected
        {exclusions && exclusions.length > 0 && (
          <span className="ml-2 text-rose-700">
            · {userExclusionCount} exclusion(s)
          </span>
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button size="sm" onClick={onSave} disabled={!canSave}>
            Save attachments
          </Button>
        )}
      </div>
    </div>
  );
}
