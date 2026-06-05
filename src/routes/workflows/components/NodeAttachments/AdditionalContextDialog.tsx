import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
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

interface AdditionalContextDialogProps {
  open: boolean;
  ruleLabel: string;
  ruleCondition?: string;
  initialContext: string;
  onClose: () => void;
  onSave: (context: string) => void;
  readOnly?: boolean;
}

/**
 * Edit a rule's per-attachment auditor context. The text is fed to the
 * evaluator at runtime as interpretation guidance — see backend
 * `_eval_common.evaluate_one_rule`.
 */
export default function AdditionalContextDialog({
  open,
  ruleLabel,
  ruleCondition,
  initialContext,
  onClose,
  onSave,
  readOnly = false,
}: AdditionalContextDialogProps) {
  const [text, setText] = useState(initialContext);

  // Reset the local draft every time the dialog reopens for a different
  // rule (or after a parent-side change).
  useEffect(() => {
    if (open) setText(initialContext);
  }, [open, initialContext]);

  const dirty = text !== initialContext;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4 text-indigo-600" />
            Additional context for the agent
          </DialogTitle>
          <DialogDescription className="text-xs">
            Free-text guidance the LLM consults when evaluating{" "}
            <span className="font-medium text-foreground">{ruleLabel}</span>.
            Use it for lookup tables (e.g. provider TIN lists), scoping notes,
            or field-mapping hints — it augments, not replaces, the rule's
            own condition.
          </DialogDescription>
        </DialogHeader>

        {ruleCondition ? (
          <div className="text-[11px] leading-snug bg-muted/40 border border-border rounded p-2">
            <span className="text-muted-foreground">IF </span>
            {ruleCondition}
          </div>
        ) : null}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            'e.g. A "Virgin Island Provider" means any provider whose TIN is in this list:\n' +
            "  12-3456789 — St. Croix Medical Center\n" +
            "  98-7654321 — St. Thomas Health Group\n" +
            "Read the claim’s PRPR_TIN; if it matches, treat the rule as triggered."
          }
          rows={10}
          readOnly={readOnly}
          className="text-xs font-mono leading-relaxed"
        />

        <p className="text-[10px] text-muted-foreground">
          Saves with the next workflow auto-save.{" "}
          {dirty
            ? "Unsaved changes."
            : initialContext
              ? "No changes."
              : "Empty — no extra context will be sent."}
        </p>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={readOnly || !dirty}
            onClick={() => {
              onSave(text);
              onClose();
            }}
          >
            Save context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
