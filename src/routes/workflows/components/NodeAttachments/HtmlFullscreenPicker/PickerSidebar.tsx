import { CheckSquare } from "lucide-react";
import type { CandidatePreview } from "./useCandidateExtraction";

interface PickerSidebarProps {
  candidates: CandidatePreview[];
  excludedKeys: Set<string>;
  loading: boolean;
  dataAvailable: boolean | undefined;
  onToggle: (bid: string) => void;
  onScrollTo: (bid: string) => void;
  readOnly?: boolean;
}

export default function PickerSidebar({
  candidates,
  excludedKeys,
  loading,
  dataAvailable,
  onToggle,
  onScrollTo,
  readOnly = false,
}: PickerSidebarProps) {
  return (
    <aside className="w-[440px] shrink-0 overflow-hidden flex flex-col border-r border-border bg-background">
      <div className="px-3 py-2 border-b border-border bg-emerald-50/60 text-[11px] text-emerald-900 flex items-center gap-2">
        <CheckSquare className="h-3.5 w-3.5 text-emerald-700" />
        <span className="flex-1">
          {readOnly ? (
            <b>View-only</b>
          ) : (
            <>
              <b>Tick the boxes</b> below to mark sections for exclusion.
            </>
          )}
        </span>
        <span className="text-rose-700 font-semibold">{excludedKeys.size}</span>
        <span className="text-muted-foreground">/ {candidates.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading || !dataAvailable ? null : candidates.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground italic">
            Extracting sections from the SOP…
          </div>
        ) : (
          candidates.map((c) => {
            const isExcluded = excludedKeys.has(c.target_key);
            return (
              <div
                key={c.bid}
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                onClick={readOnly ? undefined : () => onToggle(c.bid)}
                onKeyDown={
                  readOnly
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onToggle(c.bid);
                        }
                      }
                }
                className={`group flex items-start gap-3 px-3 py-2 border-b border-border transition-colors ${
                  readOnly ? "" : "cursor-pointer hover:bg-indigo-50/60"
                } ${isExcluded ? "bg-rose-50/70" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isExcluded}
                  readOnly
                  disabled={readOnly}
                  tabIndex={-1}
                  aria-label={`Exclude ${c.label}`}
                  className="mt-0.5 h-5 w-5 shrink-0 pointer-events-none"
                  style={{ accentColor: "#f43f5e" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        isExcluded
                          ? "bg-rose-100 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {c.tag}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onScrollTo(c.bid);
                      }}
                      className="text-[10px] text-indigo-700 hover:underline ml-auto"
                    >
                      Scroll to →
                    </button>
                  </div>
                  <p
                    className={`text-xs mt-1 break-words ${
                      isExcluded ? "text-rose-900" : "text-foreground"
                    }`}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {c.label || (
                      <span className="italic text-muted-foreground">
                        (empty {c.tag})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
