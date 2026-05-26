import { useState } from "react";
import { Ban, FileWarning, Maximize2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AttachableExclusion,
  WorkflowAttachable,
} from "@/interfaces/workflows";
import type { SopHtmlBlock, SopExclusionTargetKind } from "@/interfaces/sop";

interface ExclusionsTabProps {
  sopFilter: number | null;
  filteredExclusions: AttachableExclusion[];
  focusedRefKey: string | null;
  busyRuleKey: string | null;
  data: WorkflowAttachable | null;
  htmlBlocksBySop: Record<number, SopHtmlBlock[]>;
  htmlBlocksLoading: Record<number, boolean>;
  htmlBlocksError: Record<number, string | null>;
  onLoadHtmlBlocks: (sopId: number, force?: boolean) => Promise<void>;
  onToggleExclusion: (
    sopId: number,
    kind: SopExclusionTargetKind,
    key: string,
    on: boolean,
    busyRowKey?: string,
    extra?: {
      label?: string;
      snippet_text?: string;
      snippet_is_html?: boolean;
      section_label?: string;
    },
  ) => Promise<void>;
  onFocusRef: (key: string | null) => void;
  onOpenFullscreen: (sopId: number) => void;
}

export default function ExclusionsTab({
  sopFilter,
  filteredExclusions,
  focusedRefKey,
  busyRuleKey,
  data,
  htmlBlocksBySop,
  htmlBlocksLoading,
  htmlBlocksError,
  onLoadHtmlBlocks,
  onToggleExclusion,
  onFocusRef,
  onOpenFullscreen,
}: ExclusionsTabProps) {
  const [htmlPickMode, setHtmlPickMode] = useState<"list" | "click">("click");
  const [htmlBlockQuery, setHtmlBlockQuery] = useState("");
  const [htmlBlockKindFilter, setHtmlBlockKindFilter] = useState<string>("all");

  return (
    <div className="divide-y divide-border">
      {/* HTML SECTIONS PANEL — visible when a single SOP is selected */}
      {sopFilter !== null &&
        (() => {
          const allBlocks = htmlBlocksBySop[sopFilter] ?? [];
          const loading = htmlBlocksLoading[sopFilter];
          const loadErr = htmlBlocksError[sopFilter];
          const availableKinds = Array.from(
            new Set(allBlocks.map((b) => b.kind)),
          ).sort();
          const q = htmlBlockQuery.trim().toLowerCase();
          const blocks = allBlocks.filter((b) => {
            if (htmlBlockKindFilter !== "all" && b.kind !== htmlBlockKindFilter)
              return false;
            if (!q) return true;
            return (
              b.label.toLowerCase().includes(q) ||
              b.text.toLowerCase().includes(q)
            );
          });

          return (
            <div className="bg-emerald-50/40">
              <div className="px-4 py-2 border-b border-emerald-200/60 flex items-center gap-2 flex-wrap">
                <FileWarning className="h-3.5 w-3.5 text-emerald-700" />
                <p className="text-[11px] font-semibold">
                  Add / remove HTML sections
                </p>
                {/* Mode toggle */}
                <div className="inline-flex rounded-md border border-emerald-300/60 bg-background p-0.5 text-[10px] ml-2">
                  <button
                    type="button"
                    onClick={() => setHtmlPickMode("click")}
                    className={`px-2 py-0.5 rounded ${htmlPickMode === "click" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}
                  >
                    Click HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setHtmlPickMode("list")}
                    className={`px-2 py-0.5 rounded ${htmlPickMode === "list" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}
                  >
                    List view
                  </button>
                </div>
                <span className="ml-auto text-muted-foreground text-[10px]">
                  {htmlPickMode === "list"
                    ? loading
                      ? "Loading…"
                      : allBlocks.length === 0
                        ? "(no extractable sections)"
                        : `${allBlocks.length} section${allBlocks.length === 1 ? "" : "s"} extracted`
                    : "click any element below to toggle"}
                </span>
                {htmlPickMode === "list" && (
                  <button
                    type="button"
                    onClick={() => void onLoadHtmlBlocks(sopFilter, true)}
                    className="text-[10px] text-indigo-700 hover:text-indigo-800"
                  >
                    Reload
                  </button>
                )}
              </div>

              {/* Click HTML mode — launcher */}
              {htmlPickMode === "click" &&
                (() => {
                  const htmlExclCount = (data?.exclusions ?? []).filter(
                    (e) =>
                      e.sop_id === sopFilter &&
                      e.source === "user" &&
                      (e.rule_kind === "html_block" ||
                        e.target_kind === "html_block"),
                  ).length;
                  return (
                    <div className="px-6 py-8 flex flex-col items-center gap-3 bg-gradient-to-b from-emerald-50/30 to-background">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
                        <Maximize2 className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold">
                        Click-to-exclude HTML picker
                      </h3>
                      <p className="text-[12px] text-muted-foreground text-center max-w-md">
                        Opens the SOP in a fullscreen picker.{" "}
                        <b>Click any element</b> — tables, rows, cells,
                        headings, paragraphs — to mark it like a tick box. The
                        next screen lets you <b>review</b> everything you've
                        excluded (and what you've kept) before closing.
                      </p>
                      <Button
                        size="default"
                        onClick={() => onOpenFullscreen(sopFilter)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Maximize2 className="mr-1.5 h-4 w-4" />
                        Open fullscreen picker
                      </Button>
                      {htmlExclCount > 0 && (
                        <p className="text-[11px] text-rose-700">
                          {htmlExclCount} HTML element
                          {htmlExclCount === 1 ? "" : "s"} already excluded for
                          this SOP.
                        </p>
                      )}
                    </div>
                  );
                })()}

              {htmlPickMode === "list" && loadErr && (
                <div className="px-4 py-2 text-[11px] text-destructive">
                  Failed to load HTML sections: {loadErr}
                </div>
              )}

              {htmlPickMode === "list" && !loading && allBlocks.length > 0 && (
                <div className="px-4 py-2 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="text-muted-foreground">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setHtmlBlockKindFilter("all")}
                    className={`px-2 py-0.5 rounded border ${
                      htmlBlockKindFilter === "all"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    all ({allBlocks.length})
                  </button>
                  {availableKinds.map((k) => {
                    const n = allBlocks.filter((b) => b.kind === k).length;
                    const active = htmlBlockKindFilter === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setHtmlBlockKindFilter(active ? "all" : k)
                        }
                        className={`px-2 py-0.5 rounded border capitalize ${
                          active
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        {k} ({n})
                      </button>
                    );
                  })}
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={htmlBlockQuery}
                      onChange={(e) => setHtmlBlockQuery(e.target.value)}
                      placeholder="Search HTML sections…"
                      className="h-7 pl-7 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {htmlPickMode === "list" && (
                <div className="divide-y divide-emerald-100/70 max-h-[40vh] overflow-y-auto">
                  {blocks.map((b) => {
                    const isBusy = busyRuleKey === `htmlblk:${b.block_id}`;
                    return (
                      <label
                        key={b.block_id}
                        className={`px-4 py-1.5 flex items-start gap-3 hover:bg-emerald-50 cursor-pointer ${b.is_excluded ? "bg-rose-50/30" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={b.is_excluded}
                          disabled={isBusy}
                          onChange={(e) =>
                            void onToggleExclusion(
                              sopFilter,
                              "html_block",
                              b.target_key,
                              e.target.checked,
                              `htmlblk:${b.block_id}`,
                              {
                                label: b.label,
                                snippet_text: b.html,
                                snippet_is_html: true,
                                section_label: b.label,
                              },
                            )
                          }
                          className="mt-1 h-3.5 w-3.5 rounded border-input shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${
                                b.kind === "heading"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : b.kind === "table"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : b.kind === "list"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : b.kind === "callout"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : b.kind === "code"
                                          ? "bg-slate-100 text-slate-700 border-slate-300"
                                          : b.kind === "metadata"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {b.tag} · {b.kind}
                            </span>
                            {b.is_excluded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5">
                                <Ban className="h-2.5 w-2.5" /> Excluded
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] mt-0.5 truncate">
                            {b.label}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const k = `htmlblk-preview:${b.block_id}`;
                            onFocusRef(focusedRefKey === k ? null : k);
                          }}
                          title="Preview source"
                          className="h-6 w-6 inline-flex items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <FileWarning className="h-3 w-3" />
                        </button>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      {/* HINT BANNER when no SOP is filtered */}
      {sopFilter === null && (
        <div className="bg-emerald-50/40 px-4 py-2 border-b border-emerald-200/60 text-[11px] text-muted-foreground">
          <FileWarning className="inline h-3 w-3 mr-1 text-emerald-700" />
          Pick a <b>SOP</b> in the chip row above to browse and toggle
          individual HTML sections (headings, tables, lists, callouts…).
        </div>
      )}

      {filteredExclusions.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No exclusions yet. Switch to the <b>SOP Rules</b> tab and click the{" "}
          <Ban className="inline h-3 w-3 align-text-bottom" /> <b>Exclude</b>{" "}
          button on any rule, or pick HTML sections above.
        </div>
      )}

      {filteredExclusions.map((e) => {
        const isUser = e.source === "user";
        const isBusy = busyRuleKey === e.key;
        return (
          <div key={e.key} className="px-4 py-2 flex items-start gap-3">
            <Ban
              className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isUser ? "text-rose-600" : "text-amber-600"}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${
                    isUser
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isUser ? "User-marked" : "From SOP"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {e.sop_title} · {e.section_label}
                </span>
                {e.overrides_rule_keys.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Affects {e.overrides_rule_keys.length} rule
                    {e.overrides_rule_keys.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <p className="text-[12px] font-medium mt-1 truncate">
                {e.label || e.condition || e.target_key}
              </p>
              {e.action && e.action !== "(excluded by auditor)" && (
                <p className="text-[11px] mt-0.5">
                  <span className="text-muted-foreground font-medium">
                    Then{" "}
                  </span>
                  {e.action}
                </p>
              )}
              {e.reason && (
                <p className="text-[11px] mt-0.5 italic text-muted-foreground">
                  "{e.reason}"
                </p>
              )}
            </div>
            <div className="shrink-0 flex flex-col gap-1 items-end">
              {e.html_reference && (
                <button
                  type="button"
                  onClick={() =>
                    onFocusRef(focusedRefKey === e.key ? null : e.key)
                  }
                  title="Show source context"
                  className="h-6 px-1.5 inline-flex items-center gap-1 rounded border border-border bg-background text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <FileWarning className="h-3 w-3" />
                  Source
                </button>
              )}
              {isUser && e.target_kind && e.target_key && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    void onToggleExclusion(
                      e.sop_id,
                      e.target_kind!,
                      e.target_key!,
                      false,
                      e.key,
                    )
                  }
                  title="Remove this exclusion"
                  className={`h-6 px-2 inline-flex items-center gap-1 rounded text-[10px] border bg-background border-border text-muted-foreground hover:text-rose-700 hover:border-rose-300 ${isBusy ? "opacity-50" : ""}`}
                >
                  <Ban className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
