import { Ban, CheckSquare } from "lucide-react";
import type { CandidatePreview } from "./useCandidateExtraction";

interface ReviewPanelProps {
  excludedPreviews: CandidatePreview[];
  keptPreviews: CandidatePreview[];
  reviewTab: "excluded" | "kept";
  onSetReviewTab: (tab: "excluded" | "kept") => void;
  onScrollTo: (bid: string) => void;
  onToggleBid: (bid: string) => void;
  readOnly?: boolean;
}

export default function ReviewPanel({
  excludedPreviews,
  keptPreviews,
  reviewTab,
  onSetReviewTab,
  onScrollTo,
  onToggleBid,
  readOnly = false,
}: ReviewPanelProps) {
  return (
    <aside className="w-[440px] shrink-0 overflow-hidden flex flex-col bg-rose-50/20">
      <div className="px-4 py-3 border-b border-border bg-background">
        <h3 className="text-sm font-semibold mb-2">Review your exclusions</h3>
        <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[11px] w-full">
          <button
            type="button"
            onClick={() => onSetReviewTab("excluded")}
            className={`flex-1 px-3 py-1 rounded inline-flex items-center justify-center gap-1 ${
              reviewTab === "excluded"
                ? "bg-rose-600 text-white"
                : "text-muted-foreground"
            }`}
          >
            <Ban className="h-3 w-3" />
            Excluded ({excludedPreviews.length})
          </button>
          <button
            type="button"
            onClick={() => onSetReviewTab("kept")}
            className={`flex-1 px-3 py-1 rounded inline-flex items-center justify-center gap-1 ${
              reviewTab === "kept"
                ? "bg-emerald-600 text-white"
                : "text-muted-foreground"
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            Kept ({keptPreviews.length})
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {reviewTab === "excluded" &&
          (excludedPreviews.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-2 py-6">
              No elements excluded yet. Switch back to <b>Pick</b> and click
              anything in the SOP to mark it.
            </p>
          ) : (
            excludedPreviews.map((p, idx) => (
              <div
                key={p.bid}
                className="bg-background border border-rose-200 rounded-md p-2.5 text-xs shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase text-rose-700">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                    {p.tag}
                  </span>
                  <div className="ml-auto inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onScrollTo(p.bid)}
                      className="text-[10px] text-indigo-700 hover:underline"
                    >
                      Scroll to →
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => onToggleBid(p.bid)}
                      className={`text-[10px] hover:underline ${readOnly ? "text-muted-foreground cursor-not-allowed opacity-50" : "text-emerald-700"}`}
                      title={readOnly ? "View only" : "Remove from exclusions"}
                    >
                      Keep
                    </button>
                  </div>
                </div>
                <p className="text-foreground line-clamp-3 break-words">
                  {p.snippet || p.label || (
                    <span className="italic text-muted-foreground">
                      (no text)
                    </span>
                  )}
                </p>
              </div>
            ))
          ))}
        {reviewTab === "kept" &&
          (keptPreviews.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-2 py-6">
              Every candidate element is currently excluded.
            </p>
          ) : (
            <>
              {keptPreviews.slice(0, 200).map((p) => (
                <div
                  key={p.bid}
                  className="bg-background border border-border rounded-md p-2 text-xs"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {p.tag}
                    </span>
                    <div className="ml-auto inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onScrollTo(p.bid)}
                        className="text-[10px] text-indigo-700 hover:underline"
                      >
                        Scroll to →
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onToggleBid(p.bid)}
                        className={`text-[10px] hover:underline ${readOnly ? "text-muted-foreground cursor-not-allowed opacity-50" : "text-rose-700"}`}
                        title={readOnly ? "View only" : "Exclude this element"}
                      >
                        Exclude
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 break-words">
                    {p.snippet || p.label}
                  </p>
                </div>
              ))}
              {keptPreviews.length > 200 && (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">
                  Showing the first 200 of {keptPreviews.length} kept
                  candidates.
                </p>
              )}
            </>
          ))}
      </div>
    </aside>
  );
}
