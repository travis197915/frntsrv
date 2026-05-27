import { useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  ShieldCheck,
  GitBranch,
  Ban,
  FileWarning,
  Link2,
} from "lucide-react";
import { DECISION_TONE } from "@/utils/nodeAttachments";
import { ruleKeyToExclusionTarget } from "@/utils/sopRuleHelpers";
import type { SopGroup } from "@/interfaces/workflows";
import type {
  AttachableExclusion,
  AttachableSopRule,
} from "@/interfaces/workflows";
import type { SopExclusionTargetKind } from "@/interfaces/sop";

interface RulesTabProps {
  groupedBySop: SopGroup[];
  availableSopsCount: number;
  picked: Set<string>;
  pickedSequences: Map<string, number>;
  exclusionByKey: Map<string, AttachableExclusion>;
  focusedRefKey: string | null;
  busyRuleKey: string | null;
  readOnly?: boolean;
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

export default function RulesTab({
  groupedBySop,
  availableSopsCount,
  picked,
  pickedSequences,
  exclusionByKey,
  focusedRefKey,
  busyRuleKey,
  readOnly = false,
  onToggleRule,
  onToggleExclusion,
  onFocusRef,
}: RulesTabProps) {
  // Sticky SOP header height measurement — section headers stick below each SOP header.
  const sopHeaderRefs = useRef(new Map<number, HTMLDivElement>());
  const [sopHeaderHeights, setSopHeaderHeights] = useState<
    Record<number, number>
  >({});

  useLayoutEffect(() => {
    const observers: ResizeObserver[] = [];
    const measure = (sopId: number, el: HTMLDivElement) => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      setSopHeaderHeights((prev) =>
        prev[sopId] === height ? prev : { ...prev, [sopId]: height },
      );
    };
    for (const sop of groupedBySop) {
      const el = sopHeaderRefs.current.get(sop.sop_id);
      if (!el) continue;
      measure(sop.sop_id, el);
      const ro = new ResizeObserver(() => measure(sop.sop_id, el));
      ro.observe(el);
      observers.push(ro);
    }
    return () => observers.forEach((ro) => ro.disconnect());
  }, [groupedBySop]);

  if (groupedBySop.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No matching rules.{" "}
        {availableSopsCount === 0
          ? "Attach an SOP to this workflow first."
          : "Try a different SOP or search term."}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {groupedBySop.map((sop) => (
        <div key={sop.sop_id}>
          {/* SOP header — sticky */}
          <div
            ref={(el) => {
              if (el) sopHeaderRefs.current.set(sop.sop_id, el);
              else sopHeaderRefs.current.delete(sop.sop_id);
            }}
            className="sticky top-0 z-20 px-4 py-2 bg-indigo-50 border-b border-indigo-100 shadow-sm flex items-start gap-2"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-900 truncate">
                {sop.title}
              </p>
              {sop.narrative && (
                <p className="text-[11px] text-indigo-900/70 italic mt-0.5 line-clamp-2">
                  {sop.narrative}
                </p>
              )}
            </div>
          </div>

          {sop.sections.map((g) => (
            <div key={g.id}>
              <div
                className="sticky z-[15] px-4 py-1.5 bg-card border-b border-border shadow-sm flex items-center gap-2"
                style={{ top: sopHeaderHeights[sop.sop_id] ?? 0 }}
              >
                {g.sectionKey.startsWith("Pre-condition") ? (
                  <ShieldCheck className="h-3 w-3 text-amber-600" />
                ) : (
                  <GitBranch className="h-3 w-3 text-blue-600" />
                )}
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {g.sectionKey}
                </span>
              </div>
              {g.narrative && (
                <p className="px-4 pt-2 pb-1.5 text-[11px] leading-snug text-muted-foreground italic bg-muted/10 border-b border-border">
                  {g.narrative}
                </p>
              )}
              {g.rules.map((r: AttachableSopRule) => {
                const isSelected = picked.has(r.key);
                const excludedBy = r.excluded_by ?? [];
                const isExcluded =
                  excludedBy.length > 0 || r.is_exclusion === true;
                const isUserExcluded = excludedBy.some((k) =>
                  k.startsWith("user-excl:"),
                );
                const isBusy = busyRuleKey === r.key;
                return (
                  <div
                    key={r.key}
                    className={`px-4 py-2 transition-colors flex items-start gap-3 border-b border-border/40 ${isSelected ? "bg-blue-50/40" : ""} ${isExcluded ? "opacity-70" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => onToggleRule(r.key)}
                        disabled={readOnly}
                        aria-label={
                          isSelected ? "Deselect rule" : "Select rule"
                        }
                        className={readOnly ? "opacity-60 cursor-not-allowed" : ""}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          disabled={readOnly}
                          className="h-3.5 w-3.5 rounded border-input pointer-events-none"
                        />
                      </button>
                      {isSelected && pickedSequences.has(r.key) && (
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-semibold leading-none select-none">
                          {pickedSequences.get(r.key)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex-1 min-w-0 ${readOnly ? "" : "cursor-pointer"}`}
                      onClick={readOnly ? undefined : () => onToggleRule(r.key)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[r.decision_type] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                        >
                          {r.decision_type || "—"}
                        </span>
                        {r.codes.slice(0, 4).map((c) => (
                          <span
                            key={c}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {c}
                          </span>
                        ))}
                        {r.references.length > 0 && (
                          <span
                            title={`Picking this will also attach ${r.references.length} linked rule${r.references.length === 1 ? "" : "s"}${r.goto_step !== null ? ` (Step ${r.goto_step})` : ""}.`}
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            <Link2 className="h-2.5 w-2.5" />+
                            {r.references.length} linked
                            {r.goto_step !== null && ` · Step ${r.goto_step}`}
                          </span>
                        )}
                        {isExcluded && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="h-2.5 w-2.5" />
                            Excluded
                          </span>
                        )}
                      </div>
                      {r.condition && (
                        <p className="text-[11px] mt-1">
                          <span className="text-muted-foreground font-medium">
                            If{" "}
                          </span>
                          {r.condition}
                        </p>
                      )}
                      {r.action && (
                        <p className="text-[11px] mt-0.5">
                          <span className="text-muted-foreground font-medium">
                            Then{" "}
                          </span>
                          {r.action}
                        </p>
                      )}
                      {excludedBy.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <span className="text-[10px] text-rose-700/80 font-medium">
                            Excluded by:
                          </span>
                          {excludedBy.slice(0, 3).map((ek) => {
                            const ex = exclusionByKey.get(ek);
                            return (
                              <span
                                key={ek}
                                title={ex?.label || ek}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 truncate max-w-[200px]"
                              >
                                {ex?.source === "user" ? "◯ " : "⚐ "}
                                {ex?.label || ek}
                              </span>
                            );
                          })}
                          {excludedBy.length > 3 && (
                            <span className="text-[10px] text-rose-700/80">
                              +{excludedBy.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-1 items-end">
                      {r.html_reference && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusRef(focusedRefKey === r.key ? null : r.key);
                          }}
                          title="Show source context"
                          className="h-6 px-1.5 inline-flex items-center gap-1 rounded border border-border bg-background text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <FileWarning className="h-3 w-3" />
                          Source
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={readOnly || isBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          const t = ruleKeyToExclusionTarget(r);
                          void onToggleExclusion(
                            r.sop_id,
                            t.kind,
                            t.key,
                            !isUserExcluded,
                            r.key,
                          );
                        }}
                        title={
                          readOnly
                            ? "View only"
                            : isUserExcluded
                              ? "Remove this exclusion"
                              : "Mark this rule as excluded for the SOP"
                        }
                        className={`h-6 px-2 inline-flex items-center gap-1 rounded text-[10px] border ${
                          isUserExcluded
                            ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                            : "bg-background border-border text-muted-foreground hover:text-rose-700 hover:border-rose-300"
                        } ${isBusy || readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Ban className="h-3 w-3" />
                        {isUserExcluded ? "Excluded" : "Exclude"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
