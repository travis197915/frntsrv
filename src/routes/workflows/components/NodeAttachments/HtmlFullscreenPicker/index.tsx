import { useEffect, useMemo, useRef, useState } from "react";
import {
  workflowsApi,
  type AttachableSopRule,
  type AttachableExclusion,
  type WorkflowAttachable,
} from "@/lib/workflowsApi";
import { sopExclusionsApi } from "@/lib/api";
import type { DomTreeNode, SopExclusionTargetKind } from "@/interfaces/sop";
import {
  toolPickKey,
  isRulePickKey,
  isToolPickKey,
} from "@/utils/nodeAttachments";
import type { AttachedSopRule, AttachedTool, SopGroup } from "@/interfaces/workflows";
import { expandReferences } from "@/utils/sopRuleHelpers";
import { useCandidateExtraction } from "./useCandidateExtraction";
import type { SopSourceHtmlResponse } from "@/interfaces/sop";

import { useSopHtml } from "./useSopHtml";
import PickerHeader from "./PickerHeader";
import SopListSidebar from "./SopListSidebar";
import SopRulesSidebar from "./SopRulesSidebar";
import SopHtmlPane from "./SopHtmlPane";
import ToolsPanel from "./ToolsPanel";
import PickerFooter from "./PickerFooter";
import type { ActiveTab, FullscreenAttachmentPickerProps, SopEntry } from "./types";

export default function FullscreenAttachmentPicker({
  workflowId,
  selectedKeys,
  existingRules,
  onClose,
  onSave,
  readOnly = false,
}: FullscreenAttachmentPickerProps) {
  // ── Base attachable data (fast: SOP list + tools only, no rules) ───────────
  const [data, setData] = useState<WorkflowAttachable | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ── Per-SOP rules cache (lazy-loaded on first click per SOP) ────────────────
  const [sopRulesCache, setSopRulesCache] = useState<Map<number, WorkflowAttachable>>(new Map());
  const [sopRulesLoading, setSopRulesLoading] = useState(false);

  // ── Picker state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("rules");
  const [activeSopId, setActiveSopId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedKeys));
  const [pickedToolToRule, setPickedToolToRule] = useState<Map<string, string>>(new Map());
  const [busyRuleKey, setBusyRuleKey] = useState<string | null>(null);
  const [focusedRefKey, setFocusedRefKey] = useState<string | null>(null);
  const [lastToggledKey, setLastToggledKey] = useState<string | null>(null);

  // ── HTML pane DOM refs ─────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const htmlPaneRef  = useRef<HTMLDivElement | null>(null);

  // ── SOP HTML + dom-tree (via custom hook) ──────────────────────────────────
  const { sopHtml, sopDomTree } = useSopHtml(activeSopId);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Fetch base data (SOP list + tools — no rules) on mount ───────────────
  useEffect(() => {
    let cancelled = false;
    workflowsApi
      .getAttachable(workflowId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [workflowId]);

  // ── Lazy-load rules for a SOP when the user clicks it ─────────────────────
  useEffect(() => {
    if (!activeSopId || sopRulesCache.has(activeSopId)) return;
    let cancelled = false;
    setSopRulesLoading(true);
    workflowsApi
      .getAttachableSopRules(workflowId, activeSopId)
      .then((d) => { if (!cancelled) setSopRulesCache((prev) => new Map(prev).set(activeSopId, d)); })
      .catch((e) => { if (!cancelled) setErr(String(e?.message ?? e)); })
      .finally(() => { if (!cancelled) setSopRulesLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSopId, workflowId]);

  // ── Refetch current SOP's rules (e.g. after toggling an exclusion) ─────────
  const refetch = async () => {
    if (!activeSopId) return;
    setSopRulesLoading(true);
    try {
      const d = await workflowsApi.getAttachableSopRules(workflowId, activeSopId);
      setSopRulesCache((prev) => new Map(prev).set(activeSopId, d));
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setSopRulesLoading(false);
    }
  };

  const refetchAttachable = async () => {
    try {
      const d = await workflowsApi.getAttachable(workflowId);
      setData(d);
      setSopRulesCache(new Map());
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    }
  };

  // ── HTML candidate extraction (for rule → element mapping) ─────────────────
  const _extractionData = useMemo(
    () =>
      sopHtml.html && activeSopId
        ? ({ available: true } as SopSourceHtmlResponse)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sopHtml.html, activeSopId],
  );
  const { resolveByBid, hashesReady } = useCandidateExtraction(
    containerRef,
    _extractionData,
    activeSopId ?? 0,
  );

  // ── Anchor → block_id map (synthesised / dom-tree content) ──────────────────
  const anchorToBlockId = useMemo((): Map<string, string> => {
    const m = new Map<string, string>();
    if (!sopDomTree) return m;

    function walkNodes(nodes: DomTreeNode[]) {
      for (const node of nodes) {
        const stepMatch = node.section_id?.match(/^step-(\d+)$/);
        if (stepMatch && node.block_id) {
          const n = stepMatch[1];
          m.set(`step_${n}`, node.block_id);
          for (let d = 0; d <= 99; d++) {
            m.set(`step_${n}_d${d}`, node.block_id);
          }
        }
        if (node.children?.length) walkNodes(node.children);
      }
    }

    for (const root of sopDomTree.roots) {
      if (root.section_id === "pre-sections" && root.children?.length) {
        root.children.forEach((child, i) => {
          if (child.block_id) m.set(`pre_${i + 1}`, child.block_id);
        });
      }
      walkNodes([root]);
    }

    console.log("[FSP anchorMap] built", m.size, "entries", Object.fromEntries(Array.from(m.entries()).slice(0, 10)));
    return m;
  }, [sopDomTree]);

  // Rules for the currently selected SOP (null until loaded)
  const currentSopData = activeSopId ? (sopRulesCache.get(activeSopId) ?? null) : null;

  // Full lookup across ALL cached SOPs — needed for cross-SOP reference expansion
  const ruleByKey = useMemo(() => {
    const m = new Map<string, AttachableSopRule>();
    for (const sopData of sopRulesCache.values()) {
      for (const r of sopData.sop_rules) m.set(r.key, r);
    }
    return m;
  }, [sopRulesCache]);

  // key → sop_id lookup for picked-count badges — built from existingRules + all
  // cached SOPs so the SOP list always shows accurate counts even for unloaded SOPs
  const keyToSopId = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of existingRules) m.set(r.key, r.sop_id);
    for (const sopData of sopRulesCache.values()) {
      for (const r of sopData.sop_rules) m.set(r.key, r.sop_id);
    }
    return m;
  }, [existingRules, sopRulesCache]);

  // Unified resolver: data-fsp-bid attr → anchor map → label search → SHA-1 hash fallback.
  const resolveByBidFast = (bid: string, sectionLabel?: string): HTMLElement | null => {
    const root = containerRef.current;
    if (!root) return null;

    const byAttr = root.querySelector<HTMLElement>(`[data-fsp-bid="${bid}"]`);
    if (byAttr) return byAttr;

    const translatedBid = anchorToBlockId.get(bid);
    if (translatedBid) {
      const byTranslated = root.querySelector<HTMLElement>(`[data-fsp-bid="${translatedBid}"]`);
      if (byTranslated) return byTranslated;
    }

    if (sectionLabel) {
      const label  = sectionLabel.trim().toLowerCase();
      const stepRe = label.match(/^step\s+(\d+)/);
      for (const h of root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")) {
        const hText = (h.textContent || "").trim().toLowerCase();
        if (hText === label) return (h.closest("section") as HTMLElement) ?? h;
        if (stepRe) {
          const hStepRe = hText.match(/^step\s+(\d+)/);
          if (hStepRe && hStepRe[1] === stepRe[1]) return (h.closest("section") as HTMLElement) ?? h;
        }
      }
    }

    return resolveByBid(bid);
  };

  /**
   * Given the section element resolved by `resolveByBidFast` and the rule's
   * condition / action text, try to narrow the highlight to the specific <tr>
   * in the sibling decision table.  Returns the <tr> if found, otherwise null.
   *
   * HTML structure produced by the synthesiser:
   *   <section>  Step N — …  </section>
   *   <table>  Decisions for Step N … <tr>…</tr> </table>
   *
   * For precondition rules there is no table, so this returns null quickly.
   */
  const resolveToDecisionRow = (
    sectionEl: HTMLElement,
    condition: string,
    action: string,
  ): HTMLTableRowElement | null => {
    // The decision table is either the next sibling or a sibling a few nodes away.
    const parent = sectionEl.parentElement;
    if (!parent) return null;

    // Collect candidate tables: next sibling table + any table inside the section.
    const candidates: HTMLTableElement[] = [];
    let sibling = sectionEl.nextElementSibling as HTMLElement | null;
    // Walk at most 3 siblings to find the adjacent table.
    for (let i = 0; i < 3 && sibling; i++) {
      if (sibling.tagName === "TABLE") {
        candidates.push(sibling as HTMLTableElement);
        break;
      }
      sibling = sibling.nextElementSibling as HTMLElement | null;
    }
    // Also check any table nested inside the section itself.
    const inner = sectionEl.querySelector<HTMLTableElement>("table");
    if (inner && !candidates.includes(inner)) candidates.push(inner);

    if (candidates.length === 0) return null;

    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const condNorm   = norm(condition);
    const actionNorm = norm(action);
    if (!condNorm && !actionNorm) return null;

    for (const table of candidates) {
      for (const row of Array.from(table.rows)) {
        const cells = Array.from(row.cells);
        if (cells.length < 2) continue;
        const c0 = norm(cells[0].textContent ?? "");
        const c1 = norm(cells[1].textContent ?? "");
        // Both condition and action must partially match (order: full → partial).
        const condMatch   = !condNorm   || c0 === condNorm   || c0.includes(condNorm)   || condNorm.includes(c0);
        const actionMatch = !actionNorm || c1 === actionNorm || c1.includes(actionNorm) || actionNorm.includes(c1);
        if (condMatch && actionMatch && (c0 !== "" || c1 !== "")) {
          return row as HTMLTableRowElement;
        }
      }
    }
    return null;
  };

  const scrollToEl = (el: HTMLElement) => {
    const pane = htmlPaneRef.current;
    if (!pane) return;
    // Elements inside the pane share the same offsetParent as the pane itself
    // (the fixed overlay div), so the offsetTop walk overshoots by pane.offsetTop.
    // Instead: compute the element's absolute position in the scroll content from
    // the current viewport coords — this is correct at any scroll position.
    //   posInContent = pane.scrollTop + (el.top_in_viewport - pane.top_in_viewport)
    const elRect   = el.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    const posInContent = pane.scrollTop + (elRect.top - paneRect.top);
    // Subtract sticky bar height + a little breathing room
    const stickyBar   = pane.querySelector<HTMLElement>(".sticky");
    const stickyH     = stickyBar ? stickyBar.offsetHeight : 0;
    pane.scrollTo({ top: Math.max(0, posInContent - stickyH - 24), behavior: "smooth" });
  };

  // ── Highlight selected rules in the HTML pane ──────────────────────────────
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll(".fsp-rule-highlight").forEach((el) => el.classList.remove("fsp-rule-highlight"));

    const ruleKeys = Array.from(picked).filter(isRulePickKey);
    console.log("[FSP highlight] effect fired", {
      ruleKeys,
      hashesReady,
      anchorMapSize: anchorToBlockId.size,
      containerHasContent: root.children.length > 0,
      sampleBids: Array.from(root.querySelectorAll("[data-fsp-bid]")).slice(0, 5).map((e) => e.getAttribute("data-fsp-bid")),
    });

    let scrollTarget: HTMLElement | null = null;
    for (const key of ruleKeys) {
      const rule = ruleByKey.get(key);
      const anchor = rule?.html_reference?.anchor;
      if (!anchor) continue;
      const sectionLabel = rule.section_label || rule.html_reference?.section_label;
      const sectionEl = resolveByBidFast(anchor, sectionLabel);
      if (!sectionEl) continue;

      // For decision rules (if/then rows), try to narrow to the specific <tr>
      // in the sibling decision table — much more precise than the whole section.
      let highlightEl: HTMLElement = sectionEl;
      if (rule.source === "decision" && rule.condition && rule.action) {
        const tr = resolveToDecisionRow(sectionEl, rule.condition, rule.action);
        if (tr) highlightEl = tr;
      }

      highlightEl.classList.add("fsp-rule-highlight");
      if (key === lastToggledKey) scrollTarget = highlightEl;
    }
    if (scrollTarget) scrollToEl(scrollTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, hashesReady, ruleByKey, lastToggledKey, anchorToBlockId]);

  // ── Pulse + scroll when user clicks the "Source" button on a rule ──────────
  useEffect(() => {
    if (!focusedRefKey) return;
    const rule = ruleByKey.get(focusedRefKey);
    if (!rule?.html_reference?.anchor) return;
    const sectionLabel = rule.section_label || rule.html_reference?.section_label;
    const sectionEl = resolveByBidFast(rule.html_reference.anchor, sectionLabel);
    if (!sectionEl) return;
    let el: HTMLElement = sectionEl;
    if (rule.source === "decision" && rule.condition && rule.action) {
      const tr = resolveToDecisionRow(sectionEl, rule.condition, rule.action);
      if (tr) el = tr;
    }
    el.classList.add("fsp-rule-focused");
    scrollToEl(el);
    const timer = setTimeout(() => el.classList.remove("fsp-rule-focused"), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedRefKey, hashesReady, ruleByKey]);

  // ── Derived values ─────────────────────────────────────────────────────────

  // SOP list with rule counts — loaded rule counts take priority over null
  const availableSops = useMemo((): SopEntry[] => {
    if (!data) return [];
    if (data.sops && data.sops.length > 0) {
      return data.sops.map((s) => {
        const cached = sopRulesCache.get(s.sop_id);
        return {
          sop_id: s.sop_id,
          title: s.title,
          narrative: s.narrative || "",
          ruleCount: cached ? cached.sop_rules.length : (s.rule_count ?? null),
          sop_version: s.sop_version ?? null,
        };
      });
    }
    // Fallback: derive from cached rules only
    const seen = new Map<number, SopEntry>();
    for (const sopData of sopRulesCache.values()) {
      for (const r of sopData.sop_rules) {
        if (!seen.has(r.sop_id)) {
          seen.set(r.sop_id, { sop_id: r.sop_id, title: r.sop_title, narrative: "", ruleCount: sopData.sop_rules.length });
        }
      }
    }
    return Array.from(seen.values());
  }, [data, sopRulesCache]);

  const groupedBySop = useMemo((): SopGroup[] => {
    if (!currentSopData) return [];
    const q = query.trim().toLowerCase();
    const matchesQuery = (r: AttachableSopRule) =>
      !q ||
      r.condition.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.section_label.toLowerCase().includes(q) ||
      r.section_narrative.toLowerCase().includes(q) ||
      r.sop_title.toLowerCase().includes(q) ||
      r.codes.some((c) => c.toLowerCase().includes(q));

    const filtered = currentSopData.sop_rules.filter(matchesQuery);

    const bySop = new Map<number, SopGroup>();
    for (const r of filtered) {
      let sg = bySop.get(r.sop_id);
      if (!sg) {
        const meta = availableSops.find((s) => s.sop_id === r.sop_id);
        sg = { sop_id: r.sop_id, title: r.sop_title, narrative: meta?.narrative || "", sections: [] };
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
  }, [currentSopData, query, availableSops]);

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

  const exclusionByKey = useMemo(() => {
    const m = new Map<string, AttachableExclusion>();
    if (currentSopData?.exclusions) for (const e of currentSopData.exclusions) m.set(e.key, e);
    return m;
  }, [currentSopData]);

  const pickedSequences = useMemo(() => {
    const m = new Map<string, number>();
    let seq = 1;
    const existingKeys = new Set(existingRules.map((r) => r.key));
    for (const r of existingRules) { if (picked.has(r.key)) m.set(r.key, seq++); }
    for (const key of picked) {
      if (!existingKeys.has(key) && isRulePickKey(key)) m.set(key, seq++);
    }
    return m;
  }, [existingRules, picked]);

  const ruleCount = useMemo(() => Array.from(picked).filter(isRulePickKey).length, [picked]);
  const toolCount = useMemo(() => Array.from(picked).filter(isToolPickKey).length, [picked]);

  const activeSopMeta = activeSopId ? availableSops.find((s) => s.sop_id === activeSopId) ?? null : null;
  const selectedInSop = activeSopId
    ? Array.from(picked).filter((k) => isRulePickKey(k) && ruleByKey.get(k)?.sop_id === activeSopId).length
    : 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggle = (key: string) => {
    if (readOnly) return;
    if (isRulePickKey(key)) setLastToggledKey(key);
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
    if (readOnly) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) next.delete(toolKey); else next.add(toolKey);
      return next;
    });
    setPickedToolToRule((prev) => {
      const next = new Map(prev);
      if (ruleKey && !picked.has(toolKey)) next.set(toolKey, ruleKey);
      else if (!ruleKey) next.delete(toolKey);
      return next;
    });
  };

  const toggleExclusion = async (
    sopId: number,
    kind: SopExclusionTargetKind,
    key: string,
    on: boolean,
    busyRowKey?: string,
  ) => {
    if (readOnly) return;
    if (busyRowKey) setBusyRuleKey(busyRowKey);
    try {
      await sopExclusionsApi.toggle(sopId, { target_kind: kind, target_key: key, on });
      await refetch();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      if (busyRowKey) setBusyRuleKey(null);
    }
  };

  const handleSave = () => {
    if (!data) return;
    // Build lookup from ALL cached SOP rules (user may have picked across multiple SOPs)
    const allCachedRules: AttachableSopRule[] = [];
    for (const sopData of sopRulesCache.values()) allCachedRules.push(...sopData.sop_rules);
    const ruleDataByKey = new Map(allCachedRules.map((r) => [r.key, r]));
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
          // Carry the hierarchy so picked sub-rules indent under their parent
          // exactly like auto-built nodes (rules → sub-rules → sub-sub-rules).
          subrule_id: r.subrule_id,
          depth: r.depth,
          is_out_of_scope: r.is_out_of_scope,
          condition: r.condition,
          action: r.action,
          decision_type: r.decision_type,
          codes: r.codes,
        });
      }
    }

    const rules: AttachedSopRule[] = ordered.map((r, i) => ({ ...r, ordering: i }));
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-80 bg-black/70 flex" onClick={onClose}>
      <div
        className="bg-background w-screen h-screen flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <PickerHeader
          readOnly={readOnly}
          activeTab={activeTab}
          sopRulesCount={currentSopData?.sop_rules.length}
          toolCallsCount={data?.tool_calls.length}
          query={query}
          onClose={onClose}
          onTabChange={setActiveTab}
          onQueryChange={setQuery}
        />

        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* ═══ SOP RULES TAB ═══ */}
          {activeTab === "rules" && (
            <>
              <aside className="w-[420px] shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
                {activeSopId === null ? (
                  <SopListSidebar
                    availableSops={availableSops}
                    picked={picked}
                    keyToSopId={keyToSopId}
                    data={data}
                    err={err}
                    onSelectSop={setActiveSopId}
                    canReview={!readOnly}
                    onReviewComplete={() => void refetchAttachable()}
                  />
                ) : (
                  <SopRulesSidebar
                    sopId={activeSopId}
                    sopMeta={activeSopMeta}
                    selectedInSop={selectedInSop}
                    data={currentSopData}
                    rulesLoading={sopRulesLoading}
                    groupedBySop={groupedBySop}
                    picked={picked}
                    pickedSequences={pickedSequences}
                    exclusionByKey={exclusionByKey}
                    focusedRefKey={focusedRefKey}
                    busyRuleKey={busyRuleKey}
                    readOnly={readOnly}
                    onBack={() => setActiveSopId(null)}
                    onToggleRule={toggle}
                    onToggleExclusion={toggleExclusion}
                    onFocusRef={setFocusedRefKey}
                  />
                )}
              </aside>

              <SopHtmlPane
                activeSopId={activeSopId}
                sopHtml={sopHtml}
                containerRef={containerRef}
                htmlPaneRef={htmlPaneRef}
              />
            </>
          )}

          {/* ═══ TOOLS TAB ═══ */}
          {activeTab === "tools" && (
            <ToolsPanel
              data={data}
              err={err}
              filteredTools={filteredTools}
              picked={picked}
              pickedToolToRule={pickedToolToRule}
              focusedRefKey={focusedRefKey}
              ruleByKey={ruleByKey}
              readOnly={readOnly}
              onToggleTool={toggleToolForRule}
              customRules={existingRules.filter((r) => r.is_custom)}
              onFocusRef={setFocusedRefKey}
            />
          )}
        </div>

        <PickerFooter
          ruleCount={ruleCount}
          toolCount={toolCount}
          exclusions={data?.exclusions}
          readOnly={readOnly}
          canSave={!!data}
          onClose={onClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
