import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditRuleDialogProps {
  open: boolean;
  ruleLabel: string;
  initialCondition: string;
  initialAction: string;
  /** True for a SOP-backed rule — an edit here overrides that one binding's
   * text on this node only; it never touches the canonical SOP rule, so
   * other workflows/nodes bound to the same SOP rule are unaffected. */
  isSopBacked: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (condition: string, action: string) => void;
}

/**
 * Edits `condition`/`action` for an already-attached rule (SOP-backed or
 * custom). For a SOP-backed rule this becomes the NodeRuleBinding.condition/
 * action override on this shape only — the canonical AuditDecision the SOP
 * rule came from is never written (see builder/bindings_sync.py::
 * extract_bindings_from_properties, which only ever upserts NodeRuleBinding).
 * Saves through the same node `onUpdate` → full graph PUT path every other
 * node-property edit already uses.
 */
export default function EditRuleDialog({
  open,
  ruleLabel,
  initialCondition,
  initialAction,
  isSopBacked,
  readOnly = false,
  onClose,
  onSave,
}: EditRuleDialogProps) {
  const [condition, setCondition] = useState(initialCondition);
  const [action, setAction] = useState(initialAction);

  useEffect(() => {
    if (open) {
      setCondition(initialCondition);
      setAction(initialAction);
    }
  }, [open, initialCondition, initialAction]);

  const dirty = condition !== initialCondition || action !== initialAction;
  const canSave = !readOnly && dirty && (condition.trim().length > 0 || action.trim().length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4 text-indigo-600" />
            Edit rule
          </DialogTitle>
          <DialogDescription className="text-xs">
            Editing <span className="font-medium text-foreground">{ruleLabel}</span>.{" "}
            {isSopBacked
              ? "This overrides the wording on this node only — the SOP's own rule and every other workflow using it are unchanged."
              : "This is a workflow-only custom rule."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">If (condition)</label>
          <Textarea
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="When does this rule apply?"
            rows={5}
            readOnly={readOnly}
            className="text-xs leading-relaxed"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Then (action)</label>
          <Textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="What should the auditor / agent do?"
            rows={5}
            readOnly={readOnly}
            className="text-xs leading-relaxed"
          />
        </div>

        <p className="text-[10px] text-muted-foreground">
          Saves with the next workflow auto-save.{" "}
          {dirty ? "Unsaved changes." : "No changes."}
        </p>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            onClick={() => {
              onSave(condition.trim(), action.trim());
              onClose();
            }}
          >
            Save rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
