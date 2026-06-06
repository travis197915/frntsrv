import { useEffect, useState } from "react";
import { NotebookPen, ListTree } from "lucide-react";
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
import { DECISION_TONE } from "@/utils/nodeAttachments";
import type { AttachedSopRule } from "@/interfaces/workflows";

interface AdditionalContextDialogProps {
  open: boolean;
  ruleLabel: string;
  ruleCondition?: string;
  initialContext: string;
  onClose: () => void;
  onSave: (context: string) => void;
  readOnly?: boolean;
  /** Every rule attached to this node (for the "Rules" tab tree). */
  rules?: AttachedSopRule[];
  /** Indentation level per rule key (rules → sub-rules → sub-sub-rules). */
  depthByKey?: Map<string, number>;
  /** The rule whose context is being edited — highlighted in the tree. */
  activeKey?: string;
}

/**
 * Two-tab dialog for a node's rules:
 *  • "Node rules" — the full nested rule tree (rules / sub-rules / sub-sub-rules).
 *  • "Add context" — per-rule free-text guidance fed to the evaluator at
 *    runtime (see backend `_eval_common.evaluate_one_rule`).
 */
export default function AdditionalContextDialog({
  open,
  ruleLabel,
  ruleCondition,
  initialContext,
  onClose,
  onSave,
  readOnly = false,
  rules = [],
  depthByKey,
  activeKey,
}: AdditionalContextDialogProps) {
  const [text, setText] = useState(initialContext);
  const [tab, setTab] = useState<"rules" | "context">("rules");

  // Reset the local draft + default tab every time the dialog reopens.
  useEffect(() => {
    if (open) {
      setText(initialContext);
      setTab("rules");
    }
  }, [open, initialContext]);

  const dirty = text !== initialContext;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4 text-indigo-600" />
            Node rules &amp; agent context
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review every rule attached to this node, then optionally add
            free-text guidance the LLM consults when evaluating{" "}
            <span className="font-medium text-foreground">{ruleLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("rules")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${
              tab === "rules"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListTree className="h-3.5 w-3.5" />
            Node rules
            <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] text-muted-foreground">
              {rules.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("context")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${
              tab === "context"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Add context
            {(initialContext ?? "").trim() && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {tab === "rules" ? (
          <div className="max-h-[420px] overflow-y-auto pr-1 space-y-1">
            {rules.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-4 text-center">
                No rules attached to this node.
              </p>
            ) : (
              <ul className="space-y-1">
                {rules.map((r) => {
                  const depth = depthByKey?.get(r.key) ?? r.depth ?? 0;
                  const isActive = r.key === activeKey;
                  const oos = !!r.is_out_of_scope;
                  return (
                    <li
                      key={r.key}
                      style={{ marginLeft: depth > 0 ? depth * 16 : undefined }}
                      className={`rounded border p-2 ${
                        depth > 0
                          ? "border-l-2 border-l-indigo-300 border-border/60"
                          : "border-border"
                      } ${
                        isActive
                          ? "ring-1 ring-indigo-400 bg-indigo-50/60"
                          : oos
                            ? "bg-rose-50/60 border-rose-200"
                            : "bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${
                            DECISION_TONE[r.decision_type] ||
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {r.decision_type || "—"}
                        </span>
                        {r.subrule_id && (
                          <span className="font-mono text-[10px] px-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {r.subrule_id}
                          </span>
                        )}
                        {oos && (
                          <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Out of scope
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                            Editing context
                          </span>
                        )}
                      </div>
                      {r.condition && (
                        <p className="text-[11px] leading-snug whitespace-pre-line">
                          <span className="text-muted-foreground">If </span>
                          {r.condition}
                        </p>
                      )}
                      {r.action && (
                        <p className="text-[11px] leading-snug whitespace-pre-line">
                          <span className="text-muted-foreground">Then </span>
                          {r.action}
                        </p>
                      )}
                      {(r.additional_context ?? "").trim() && (
                        <p className="mt-1 text-[10px] leading-snug italic text-indigo-700/80 border-l-2 border-indigo-300 pl-2">
                          Context: {r.additional_context}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <>
            {ruleCondition ? (
              <div className="text-[11px] leading-snug bg-muted/40 border border-border rounded p-2 whitespace-pre-line">
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
          </>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {tab === "rules" ? "Close" : "Cancel"}
          </Button>
          {tab === "rules"
            ? !readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setTab("context")}
                >
                  <NotebookPen className="h-3.5 w-3.5 mr-1" />
                  Add context
                </Button>
              )
            : (
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
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
