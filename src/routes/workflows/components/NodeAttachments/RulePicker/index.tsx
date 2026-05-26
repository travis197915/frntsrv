import { useEffect, useMemo, useState } from "react";
import { X, Search, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  workflowsApi,
  type AttachableExclusion,
  type AttachableSopRule,
  type WorkflowAttachable,
} from "@/lib/workflowsApi";
import { sopExclusionsApi } from "@/lib/api";
import type { SopExclusionTargetKind } from "@/interfaces/sop";
import {
  toolPickKey,
  isRulePickKey,
  isToolPickKey,
} from "@/utils/nodeAttachments";
import type { AttachedSopRule, AttachedTool } from "@/interfaces/workflows";
import { expandReferences } from "@/utils/sopRuleHelpers";
import { useHtmlBlocks } from "./useHtmlBlocks";
import SopFilterChips from "./SopFilterChips";
import RulesTab from "./RulesTab";
import ExclusionsTab from "./ExclusionsTab";
import ToolsTab from "./ToolsTab";
import FocusedRefPanel from "./FocusedRefPanel";
import HtmlClickFullscreenModal from "../HtmlFullscreenPicker";
import type { SopGroup } from "@/interfaces/workflows";

interface RulePickerProps {
  workflowId: string;
  selectedKeys: Set<string>;
  existingRules: AttachedSopRule[];
  onClose: () => void;
  onSave: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
}

export default function RulePicker({
  workflowId,
  selectedKeys,
  existingRules,
  onClose,
  onSave,
}: RulePickerProps) {
  const [data, setData] = useState<WorkflowAttachable | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"rules" | "exclusions" | "tools">("rules");
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedKeys));
  const [pickedToolToRule, setPickedToolToRule] = useState<Map<string, string>>(
    new Map(),
  );
  const [sopFilter, setSopFilter] = useState<number | null>(null);
  const [busyRuleKey, setBusyRuleKey] = useState<string | null>(null);
  const [focusedRefKey, setFocusedRefKey] = useState<string | null>(null);
  const [fullscreenSopId, setFullscreenSopId] = useState<number | null>(null);

  const {
    htmlBlocksBySop,
    setHtmlBlocksBySop,
    htmlBlocksLoading,
    htmlBlocksError,
    loadHtmlBlocks,
  } = useHtmlBlocks();

  const refetch = async () => {
    try {
      const d = await workflowsApi.getAttachable(workflowId);
      setData(d);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    }
  };

  useEffect(() => {
    let cancelled = false;
    workflowsApi
      .getAttachable(workflowId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  // Lazy-load HTML blocks when the exclusions tab has a single SOP selected.
  useEffect(() => {
    if (tab !== "exclusions" || sopFilter === null) return;
    if (htmlBlocksBySop[sopFilter] !== undefined) return;
    void loadHtmlBlocks(sopFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sopFilter]);

  /** Toggle an exclusion on or off via the backend, then re-fetch. */
  const toggleExclusion = async (
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
  ) => {
    if (busyRowKey) setBusyRuleKey(busyRowKey);
    try {
      await sopExclusionsApi.toggle(sopId, {
        target_kind: kind,
        target_key: key,
        on,
        ...(extra?.label ? { label: extra.label } : {}),
        ...(extra?.snippet_text ? { snippet_text: extra.snippet_text } : {}),
        ...(extra?.snippet_is_html !== undefined ||
        extra?.section_label !== undefined
          ? {
              metadata: {
                ...(extra.snippet_is_html !== undefined
                  ? { snippet_is_html: extra.snippet_is_html }
                  : {}),
                ...(extra.section_label !== undefined
                  ? { section_label: extra.section_label }
                  : {}),
              },
            }
          : {}),
      });
      await refetch();
      if (kind === "html_block") {
        try {
          const r = await sopExclusionsApi.listHtmlBlocks(sopId);
          setHtmlBlocksBySop((prev) => ({ ...prev, [sopId]: r.blocks }));
        } catch {
          /* non-fatal */
        }
      }
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      if (busyRowKey) setBusyRuleKey(null);
    }
  };

  // ── Derived / computed values ──────────────────────────────────────────────

  const availableSops = useMemo(() => {
    if (!data)
      return [] as {
        sop_id: number;
        title: string;
        narrative: string;
        ruleCount: number;
      }[];
    const counts = new Map<number, number>();
    for (const r of data.sop_rules)
      counts.set(r.sop_id, (counts.get(r.sop_id) ?? 0) + 1);
    if (data.sops && data.sops.length > 0) {
      return data.sops.map((s) => ({
        sop_id: s.sop_id,
        title: s.title,
        narrative: s.narrative || "",
        ruleCount: counts.get(s.sop_id) ?? 0,
      }));
    }
    const seen = new Map<
      number,
      { sop_id: number; title: string; narrative: string; ruleCount: number }
    >();
    for (const r of data.sop_rules) {
      if (!seen.has(r.sop_id)) {
        seen.set(r.sop_id, {
          sop_id: r.sop_id,
          title: r.sop_title,
          narrative: "",
          ruleCount: counts.get(r.sop_id) ?? 0,
        });
      }
    }
    return Array.from(seen.values());
  }, [data]);

  const groupedBySop = useMemo((): SopGroup[] => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const matchesQuery = (r: AttachableSopRule) =>
      !q ||
      r.condition.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.section_label.toLowerCase().includes(q) ||
      r.section_narrative.toLowerCase().includes(q) ||
      r.sop_title.toLowerCase().includes(q) ||
      r.codes.some((c) => c.toLowerCase().includes(q));

    const filtered = data.sop_rules.filter(
      (r) => (sopFilter === null || r.sop_id === sopFilter) && matchesQuery(r),
    );

    const bySop = new Map<number, SopGroup>();
    for (const r of filtered) {
      let sg = bySop.get(r.sop_id);
      if (!sg) {
        const meta = availableSops.find((s) => s.sop_id === r.sop_id);
        sg = {
          sop_id: r.sop_id,
          title: r.sop_title,
          narrative: meta?.narrative || "",
          sections: [],
        };
        bySop.set(r.sop_id, sg);
      }
      const sectionId = `${r.sop_id}::${r.source}::${r.section_label}`;
      let section = sg.sections.find((s) => s.id === sectionId);
      if (!section) {
        section = {
          id: sectionId,
          sectionKey: `${r.source === "precondition" ? "Pre-condition" : "Decision"} · ${r.section_label}`,
          narrative: r.section_narrative || "",
          rules: [],
        };
        sg.sections.push(section);
      }
      section.rules.push(r);
    }
    return Array.from(bySop.values());
  }, [data, query, sopFilter, availableSops]);

  const filteredTools = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.tool_calls;
    return data.tool_calls.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.url ?? "").toLowerCase().includes(q) ||
        (t.method ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  const ruleByKey = useMemo(() => {
    const m = new Map<string, AttachableSopRule>();
    if (data) for (const r of data.sop_rules) m.set(r.key, r);
    return m;
  }, [data]);

  const pickedSequences = useMemo(() => {
    const m = new Map<string, number>();
    let seq = 1;
    const existingKeys = new Set(existingRules.map((r) => r.key));
    for (const r of existingRules) {
      if (picked.has(r.key)) m.set(r.key, seq++);
    }
    for (const key of picked) {
      if (!existingKeys.has(key) && isRulePickKey(key)) {
        m.set(key, seq++);
      }
    }
    return m;
  }, [existingRules, picked]);

  const filteredExclusions = useMemo(() => {
    if (!data?.exclusions) return [] as AttachableExclusion[];
    const q = query.trim().toLowerCase();
    return data.exclusions.filter((e) => {
      if (sopFilter !== null && e.sop_id !== sopFilter) return false;
      if (!q) return true;
      return (
        e.label.toLowerCase().includes(q) ||
        (e.condition || "").toLowerCase().includes(q) ||
        (e.action || "").toLowerCase().includes(q) ||
        e.section_label.toLowerCase().includes(q) ||
        e.sop_title.toLowerCase().includes(q)
      );
    });
  }, [data, query, sopFilter]);

  const exclusionByKey = useMemo(() => {
    const m = new Map<string, AttachableExclusion>();
    if (data?.exclusions) for (const e of data.exclusions) m.set(e.key, e);
    return m;
  }, [data]);

  const focusedRef = useMemo(() => {
    if (!focusedRefKey || !data) return null;
    if (focusedRefKey.startsWith("htmlblk-preview:")) {
      const blockId = focusedRefKey.slice("htmlblk-preview:".length);
      for (const [sid, list] of Object.entries(htmlBlocksBySop)) {
        const b = list.find((x) => x.block_id === blockId);
        if (b) {
          const sopMeta = data.sops?.find((s) => s.sop_id === Number(sid));
          return {
            title: sopMeta?.title || `SOP #${sid}`,
            section: b.label,
            ref: {
              source_url: sopMeta?.source_url || "",
              doc_format: sopMeta?.doc_format || "HTML",
              anchor: b.block_id,
              section_label: b.label,
              snippet_text: b.text,
              snippet_html: b.html,
            },
          };
        }
      }
      return null;
    }
    const r = ruleByKey.get(focusedRefKey);
    if (r?.html_reference) {
      return {
        title: r.sop_title,
        section: r.section_label,
        ref: r.html_reference,
      };
    }
    const e = exclusionByKey.get(focusedRefKey);
    if (e?.html_reference) {
      return {
        title: e.sop_title,
        section: e.section_label,
        ref: e.html_reference,
      };
    }
    return null;
  }, [focusedRefKey, data, ruleByKey, exclusionByKey, htmlBlocksBySop]);

  const ruleCount = useMemo(
    () => Array.from(picked).filter(isRulePickKey).length,
    [picked],
  );
  const toolCount = useMemo(
    () => Array.from(picked).filter(isToolPickKey).length,
    [picked],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggle = (key: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        for (const k of expandReferences(key, ruleByKey)) next.add(k);
      }
      return next;
    });
    if (isToolPickKey(key)) {
      setPickedToolToRule((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const toggleToolForRule = (toolKey: string, ruleKey: string | null) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) next.delete(toolKey);
      else next.add(toolKey);
      return next;
    });
    setPickedToolToRule((prev) => {
      const next = new Map(prev);
      if (ruleKey && !picked.has(toolKey)) next.set(toolKey, ruleKey);
      else if (!ruleKey) next.delete(toolKey);
      return next;
    });
  };

  const handleSave = () => {
    if (!data) return;
    const ruleDataByKey = new Map(data.sop_rules.map((r) => [r.key, r]));
    const existingKeys = new Set(existingRules.map((r) => r.key));
    const ordered: AttachedSopRule[] = [];

    for (const existing of existingRules) {
      if (picked.has(existing.key)) ordered.push(existing);
    }
    for (const key of picked) {
      if (!existingKeys.has(key) && isRulePickKey(key)) {
        const r = ruleDataByKey.get(key);
        if (!r) continue;
        ordered.push({
          key: r.key,
          ordering: 0,
          sop_id: r.sop_id,
          sop_title: r.sop_title,
          source: r.source,
          section_label: r.section_label,
          section_narrative: r.section_narrative || "",
          condition: r.condition,
          action: r.action,
          decision_type: r.decision_type,
          codes: r.codes,
        });
      }
    }

    const rules: AttachedSopRule[] = ordered.map((r, i) => ({
      ...r,
      ordering: i,
    }));
    const tools: AttachedTool[] = data.tool_calls
      .filter((t) => picked.has(toolPickKey(t)))
      .map((t) => {
        const pickKey = toolPickKey(t);
        const linkedRule = pickedToolToRule.get(pickKey) ?? null;
        return {
          key: pickKey,
          tool_id: t.tool_id,
          tool_kind: (t.tool_kind || t.kind) as AttachedTool["tool_kind"],
          display_name: t.display_name || t.name,
          description: t.description,
          args_schema: t.args_schema,
          endpoint_id: t.endpoint_id || "",
          name: t.name,
          method: t.method || (t.tool_kind === "api_agent" ? "GET" : "POST"),
          url: t.url || t.invoke_url || "",
          rule_key: linkedRule,
          rule_binding_id: null,
        };
      });

    onSave(rules, tools);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">
            Attach rules &amp; tools to this node
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs + search */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setTab("rules")}
              className={`px-3 py-1 rounded ${tab === "rules" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              SOP Rules{" "}
              {data && (
                <span className="text-[10px] text-muted-foreground">
                  ({data.sop_rules.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("exclusions")}
              className={`px-3 py-1 rounded inline-flex items-center gap-1 ${tab === "exclusions" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              <Ban className="h-3 w-3" />
              Exclusions{" "}
              {data?.exclusions && (
                <span className="text-[10px] text-muted-foreground">
                  ({data.exclusions.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("tools")}
              className={`px-3 py-1 rounded ${tab === "tools" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              Tool Calls{" "}
              {data && (
                <span className="text-[10px] text-muted-foreground">
                  ({data.tool_calls.length})
                </span>
              )}
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "rules"
                  ? "Search rules, sections, codes…"
                  : tab === "exclusions"
                    ? "Search exclusions…"
                    : "Search tools…"
              }
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* SOP filter chips — on rules + exclusions tabs */}
        {data &&
          (tab === "rules" || tab === "exclusions") &&
          availableSops.length > 0 && (
            <SopFilterChips
              availableSops={availableSops}
              totalRuleCount={data.sop_rules.length}
              sopFilter={sopFilter}
              onSetSopFilter={setSopFilter}
            />
          )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {err && (
            <div className="p-4 text-sm text-destructive">Failed: {err}</div>
          )}
          {!data && !err && (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          )}

          {data && tab === "rules" && (
            <RulesTab
              groupedBySop={groupedBySop}
              availableSopsCount={availableSops.length}
              picked={picked}
              pickedSequences={pickedSequences}
              exclusionByKey={exclusionByKey}
              focusedRefKey={focusedRefKey}
              busyRuleKey={busyRuleKey}
              onToggleRule={toggle}
              onToggleExclusion={toggleExclusion}
              onFocusRef={setFocusedRefKey}
            />
          )}

          {data && tab === "exclusions" && (
            <ExclusionsTab
              sopFilter={sopFilter}
              filteredExclusions={filteredExclusions}
              focusedRefKey={focusedRefKey}
              busyRuleKey={busyRuleKey}
              data={data}
              htmlBlocksBySop={htmlBlocksBySop}
              htmlBlocksLoading={htmlBlocksLoading}
              htmlBlocksError={htmlBlocksError}
              onLoadHtmlBlocks={loadHtmlBlocks}
              onToggleExclusion={toggleExclusion}
              onFocusRef={setFocusedRefKey}
              onOpenFullscreen={setFullscreenSopId}
            />
          )}

          {data && tab === "tools" && (
            <ToolsTab
              filteredTools={filteredTools}
              picked={picked}
              pickedToolToRule={pickedToolToRule}
              focusedRefKey={focusedRefKey}
              ruleByKey={ruleByKey}
              onToggleTool={toggleToolForRule}
            />
          )}
        </div>

        {/* Focused source-of-truth panel */}
        <FocusedRefPanel
          focusedRef={focusedRef}
          onClose={() => setFocusedRefKey(null)}
        />

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {ruleCount} rule{ruleCount === 1 ? "" : "s"} · {toolCount} tool
            {toolCount === 1 ? "" : "s"} selected
            {data?.exclusions && data.exclusions.length > 0 && (
              <span className="ml-2 text-rose-700">
                · {data.exclusions.filter((e) => e.source === "user").length}{" "}
                user exclusion(s)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save attachments
            </Button>
          </div>
        </div>
      </div>

      {/* Fullscreen "Click HTML to exclude" picker */}
      {fullscreenSopId !== null && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <HtmlClickFullscreenModal
            sopId={fullscreenSopId}
            sopTitle={
              availableSops.find((s) => s.sop_id === fullscreenSopId)?.title ??
              `SOP #${fullscreenSopId}`
            }
            onClose={() => {
              setFullscreenSopId(null);
              void refetch();
            }}
            onChanged={() => {
              void refetch();
            }}
          />
        </div>
      )}
    </div>
  );
}
