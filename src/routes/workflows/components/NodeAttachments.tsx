import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, X, FileText, Search, Wrench, ShieldCheck, GitBranch, Link2,
  BookOpen, Ban, ExternalLink, FileWarning, CheckSquare, Maximize2,
  ArrowRight, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  workflowsApi,
  type AttachableExclusion,
  type AttachableSopRule,
  type WorkflowAttachable,
} from '@/lib/workflowsApi';
import {
  sopExclusionsApi,
  htmlBlockId,
  type SopExclusionTargetKind,
  type SopHtmlBlock,
  type SopSourceHtmlResponse,
} from '@/lib/api';

// ── Persisted shape ──────────────────────────────────────────────────────────
// Saved on `Shape.properties.sop_rules` and `.tool_calls`.
// We embed display labels so the chip can render even when the SOP is
// deleted or re-ingested.

export interface AttachedSopRule {
  key: string;
  sop_id: number;
  sop_title: string;
  source: 'precondition' | 'decision';
  section_label: string;
  /** Narrative paragraph for the parent section, copied at attach-time. */
  section_narrative?: string;
  condition: string;
  action: string;
  decision_type: string;
  codes: string[];
}

export interface AttachedTool {
  key: string;
  /** UUID of the agent_tools.Tool row (when sourced from the registry). */
  tool_id?: string;
  /** "langchain" | "api_agent" — set when sourced from the registry. */
  tool_kind?: 'langchain' | 'api_agent';
  /** Optional human label that differs from `name`. */
  display_name?: string;
  description?: string;
  /** Pydantic JSON-Schema for the tool's input model. */
  args_schema?: Record<string, unknown>;
  /** Default args to prefill at invoke time. */
  args_template?: Record<string, unknown>;
  /** rule_key of the rule this tool was picked alongside (UI-side hint). */
  rule_key?: string | null;
  /** UUID of the persisted NodeRuleBinding (server fills this in). */
  rule_binding_id?: string | null;

  endpoint_id: string;
  name: string;
  method: string;
  url: string;
}

const DECISION_TONE: Record<string, string> = {
  DENY:        'bg-red-50 text-red-700 border-red-200',
  ALLOW:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  BYPASS:      'bg-blue-50 text-blue-700 border-blue-200',
  PEND:        'bg-amber-50 text-amber-700 border-amber-200',
  REFER:       'bg-violet-50 text-violet-700 border-violet-200',
  SYSTEM:      'bg-slate-100 text-slate-700 border-slate-200',
  STOP:        'bg-red-100 text-red-800 border-red-300',
  WAIVE:       'bg-emerald-100 text-emerald-800 border-emerald-300',
  CONDITIONAL: 'bg-slate-50 text-slate-600 border-slate-200',
  NOTE:        'bg-sky-50 text-sky-700 border-sky-200',
};

// ── Fullscreen HTML-click exclusion picker (2-step Pick → Review) ────────────
// A take-over modal that opens above the RulePicker dialog and gives the user
// the full viewport to (1) walk the SOP HTML and tick elements to exclude,
// then (2) review every exclusion + every kept candidate before closing.

interface HtmlClickFullscreenModalProps {
  sopId:    number;
  sopTitle: string;
  onClose:  () => void;
  /** Called whenever an exclusion is added / removed so the parent picker
   *  can refresh /attachable/. */
  onChanged?: () => void;
}

type FullscreenStep = 'pick' | 'review';

interface CandidatePreview {
  bid:        string;
  tag:        string;
  /** 0-based index among ALL elements of this tag in the candidate scan
   *  order — used by resolveByBid to find the live DOM element even after
   *  React re-renders the dangerouslySetInnerHTML wrapper. */
  tagIndex:   number;
  label:      string;
  snippet:    string;
  target_key: string;
}

function HtmlClickFullscreenModal({
  sopId, sopTitle, onClose, onChanged,
}: HtmlClickFullscreenModalProps) {
  const [step,         setStep]         = useState<FullscreenStep>('pick');
  const [data,         setData]         = useState<SopSourceHtmlResponse | null>(null);
  const [err,          setErr]          = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  // LOCAL working copy. Mutated freely on every checkbox click. The server
  // is only touched when the user clicks Save.
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [reviewTab,    setReviewTab]    = useState<'excluded' | 'kept'>('excluded');
  const [candidates,   setCandidates]   = useState<CandidatePreview[]>([]);
  // Bumped after the per-element hash pass finishes — triggers the visual
  // sync effect to re-paint the .excl-marked classes from excludedKeys.
  const [hashesReady,  setHashesReady]  = useState(0);
  const [saving,       setSaving]       = useState(false);
  // Server state at load time. We diff against this on Save to know what
  // to add and remove. Updated only after a successful save round-trip.
  const initialExcludedRef = useRef<Set<string>>(new Set());
  // bid → {label, html} for items the user TOGGLED ON during this session.
  // Snapshots are needed by the toggle API for create-side requests.
  const pendingMetaRef = useRef<Map<string, { label: string; html: string }>>(new Map());

  const containerRef    = useRef<HTMLDivElement | null>(null);
  // Explicit ref to the overflow-y-auto HTML-pane wrapper so scrollToBid()
  // never has to walk the DOM to find the scroll container.
  const htmlPaneRef     = useRef<HTMLDivElement | null>(null);
  // Snapshot of each candidate's ORIGINAL outerHTML — hashing always reads
  // from here (live outerHTML mutates as we add/remove .excl-marked classes
  // on descendants, which would otherwise shift the parent's hash).
  const snapshotRef     = useRef<WeakMap<HTMLElement, string>>(new WeakMap());
  const hashRef         = useRef<WeakMap<HTMLElement, string>>(new WeakMap());
  const hashedListRef   = useRef<HTMLElement[]>([]);
  // bid → (tag, tagIndex) used to resolve the live DOM element by tag-and-
  // position. This survives any React re-render because it doesn't rely on
  // attributes or element refs.
  const candidateMetaRef = useRef<Map<string, { tag: string; tagIndex: number }>>(new Map());
  const elementByBidRef = useRef<Map<string, HTMLElement>>(new Map());
  const busyRef         = useRef(false);

  // Fetch sanitized source HTML once per SOP.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    setExcludedKeys(new Set());
    setCandidates([]);
    pendingMetaRef.current     = new Map();
    initialExcludedRef.current = new Set();
    sopExclusionsApi.getSourceHtml(sopId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        const initial = new Set(d.excluded_target_keys || []);
        initialExcludedRef.current = initial;
        setExcludedKeys(new Set(initial));
      })
      .catch((e) => { if (!cancelled) setErr(String((e as Error)?.message ?? e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sopId]);

  // Block-level tags we'll list in the sidebar checkbox column. We keep
  // tables themselves AND their rows so the user can pick either the
  // whole table or any single row.
  const SIDEBAR_TAGS = useMemo(() => new Set([
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'P', 'TABLE', 'TR', 'UL', 'OL', 'LI',
    'BLOCKQUOTE', 'PRE', 'FIGURE', 'DT', 'DD',
  ]), []);

  // Snapshot outerHTML for every candidate and hash each one. The HTML
  // pane is RENDERED AS-IS (read-only) — no DOM injection. Checkboxes
  // live in a separate React-controlled sidebar where the SOP's own
  // stylesheet cannot reach them.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !data?.available) return;
    let cancelled = false;

    const els = Array.from(
      root.querySelectorAll<HTMLElement>(
        Array.from(SIDEBAR_TAGS).map((t) => t.toLowerCase()).join(', '),
      ),
    ).slice(0, 6000);

    const snap = new WeakMap<HTMLElement, string>();
    for (const el of els) snap.set(el, el.outerHTML);
    snapshotRef.current = snap;

    (async () => {
      const hashes     = new WeakMap<HTMLElement, string>();
      const byBid      = new Map<string, HTMLElement>();
      const tagCounts  = new Map<string, number>();
      const previews: CandidatePreview[] = [];
      const CHUNK      = 200;
      for (let i = 0; i < els.length; i += CHUNK) {
        if (cancelled) return;
        const chunk   = els.slice(i, i + CHUNK);
        const results = await Promise.all(
          chunk.map((el) => htmlBlockId(snap.get(el) || el.outerHTML)),
        );
        results.forEach((h, j) => {
          const el  = chunk[j];
          const tag = el.tagName.toLowerCase();
          // tagIndex = position of THIS element among all elements of the
          // same tag, in candidate scan order. Stable across re-renders so
          // resolveByBid can find the live element via
          // pane.querySelectorAll(tag)[tagIndex] even after React rebuilds
          // the dangerouslySetInnerHTML subtree.
          const tagIndex = tagCounts.get(tag) ?? 0;
          tagCounts.set(tag, tagIndex + 1);
          hashes.set(el, h);
          if (!byBid.has(h)) {
            byBid.set(h, el);
            const text  = (el.textContent || '').trim();
            const label = (text || tag).slice(0, 200);
            previews.push({
              bid:        h,
              tag,
              tagIndex,
              label,
              snippet:    text.slice(0, 240),
              target_key: `html:${sopId}:${h}`,
            });
          }
        });
      }
      if (cancelled) return;
      hashRef.current         = hashes;
      hashedListRef.current   = els;
      elementByBidRef.current = byBid;
      const meta = new Map<string, { tag: string; tagIndex: number }>();
      for (const p of previews) meta.set(p.bid, { tag: p.tag, tagIndex: p.tagIndex });
      candidateMetaRef.current = meta;
      setCandidates(previews);
      setHashesReady((n) => n + 1);
    })();
    return () => { cancelled = true; };
  }, [data, sopId, SIDEBAR_TAGS]);

  // Paint .excl-marked on every candidate whose hash is in excludedKeys.
  // The HTML pane has no checkboxes; this just tints excluded blocks rose
  // so the user can spot them in context. Resolution goes through
  // candidateMetaRef so the highlight survives any container re-render.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll('.excl-marked').forEach((el) => el.classList.remove('excl-marked'));
    for (const tk of excludedKeys) {
      if (!tk.startsWith(`html:${sopId}:`)) continue;
      const bid  = tk.slice(`html:${sopId}:`.length);
      const meta = candidateMetaRef.current.get(bid);
      if (!meta) continue;
      const live = root.getElementsByTagName(meta.tag).item(meta.tagIndex) as HTMLElement | null;
      if (live) live.classList.add('excl-marked');
    }
  }, [excludedKeys, hashesReady, sopId, step]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape requests a close (which prompts if there are unsaved changes).
  // We have to re-bind on every render so the handler closure captures the
  // latest `isDirty` and pending diff.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseRequest(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // LOCAL toggle — never touches the server. The user reviews everything
  // and persists via the Save button. Async only because we may need to
  // hash a newly-discovered element to derive its block_id.
  const toggleByElement = async (el: HTMLElement) => {
    if (busyRef.current) return;
    const html  = snapshotRef.current.get(el) || el.outerHTML;
    if (!html) return;
    const text  = (el.textContent || '').trim();
    const label = (text || el.tagName.toLowerCase()).slice(0, 200);
    busyRef.current = true;
    try {
      const bid = hashRef.current.get(el) || (await htmlBlockId(html));
      if (!hashRef.current.has(el)) {
        const tag      = el.tagName.toLowerCase();
        const sameTag  = containerRef.current
          ? Array.from(containerRef.current.getElementsByTagName(tag))
          : [];
        const tagIndex = Math.max(0, sameTag.indexOf(el));
        hashRef.current.set(el, bid);
        elementByBidRef.current.set(bid, el);
        candidateMetaRef.current.set(bid, { tag, tagIndex });
        setCandidates((prev) => prev.some((p) => p.bid === bid) ? prev : [
          ...prev,
          {
            bid, label, target_key: `html:${sopId}:${bid}`,
            tag, tagIndex, snippet: text.slice(0, 240),
          },
        ]);
      }
      const tk = `html:${sopId}:${bid}`;
      // Remember the snippet/label for items the user just turned ON, so
      // Save can send the right payload even if the candidate list is
      // refreshed in the meantime.
      pendingMetaRef.current.set(bid, { label, html });
      setExcludedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(tk)) next.delete(tk); else next.add(tk);
        return next;
      });
      el.classList.add('excl-flash');
      setTimeout(() => el.classList.remove('excl-flash'), 900);
    } catch (ex) {
      setErr(String((ex as Error)?.message ?? ex));
    } finally {
      busyRef.current = false;
    }
  };

  // Symmetric diff between current selection and the initial server state.
  const pendingDiff = useMemo(() => {
    const initial = initialExcludedRef.current;
    const toAdd:    string[] = [];
    const toRemove: string[] = [];
    for (const k of excludedKeys) if (!initial.has(k))    toAdd.push(k);
    for (const k of initial)      if (!excludedKeys.has(k)) toRemove.push(k);
    return { toAdd, toRemove, count: toAdd.length + toRemove.length };
  // hashesReady is included so we re-evaluate once async hashing finishes
  // and the user's pre-existing keys line up with discovered candidates.
  }, [excludedKeys, hashesReady]);

  const isDirty = pendingDiff.count > 0;

  // Resolve a snippet/label for an "add" key. Tries (1) freshly-toggled
  // metadata, (2) the live DOM via candidateMetaRef, (3) the candidates
  // list. Returns nulls if nothing is available (server will still accept
  // an empty snippet but we try our best).
  const snippetForKey = (tk: string): { label: string; html: string } => {
    const bid     = tk.startsWith(`html:${sopId}:`) ? tk.slice(`html:${sopId}:`.length) : tk;
    const fresh   = pendingMetaRef.current.get(bid);
    if (fresh) return fresh;
    const live    = resolveByBid(bid);
    if (live) {
      const html  = snapshotRef.current.get(live) || live.outerHTML;
      const text  = (live.textContent || '').trim();
      const label = (text || live.tagName.toLowerCase()).slice(0, 200);
      return { label, html };
    }
    const cand    = candidates.find((c) => c.bid === bid);
    if (cand) return { label: cand.label, html: cand.snippet };
    return { label: bid, html: '' };
  };

  // Push the diff to the server, then close. Adds and removes are issued
  // sequentially to keep the audit log readable; failure surfaces in the
  // banner and leaves the modal open so the user doesn't lose work.
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      for (const tk of pendingDiff.toRemove) {
        await sopExclusionsApi.toggle(sopId, {
          target_kind: 'html_block',
          target_key:  tk,
          on:          false,
        });
      }
      for (const tk of pendingDiff.toAdd) {
        const { label, html } = snippetForKey(tk);
        await sopExclusionsApi.toggle(sopId, {
          target_kind:  'html_block',
          target_key:   tk,
          on:           true,
          label,
          snippet_text: html,
          metadata:     { snippet_is_html: true, section_label: label },
        });
      }
      initialExcludedRef.current = new Set(excludedKeys);
      pendingMetaRef.current     = new Map();
      onChanged?.();
      onClose();
    } catch (ex) {
      setErr(String((ex as Error)?.message ?? ex));
    } finally {
      setSaving(false);
    }
  };

  // Guarded close: warn before discarding unsaved changes.
  const handleCloseRequest = () => {
    if (isDirty && !saving) {
      const ok = window.confirm(
        `You have ${pendingDiff.count} unsaved change` +
        `${pendingDiff.count === 1 ? '' : 's'}. Discard and close?`,
      );
      if (!ok) return;
    }
    onClose();
  };

  /** Live lookup: candidates remember their (tag, tagIndex) — we re-query
   *  the live container by tag and pick that index. Survives any React
   *  re-render of the dangerouslySetInnerHTML subtree because we never
   *  rely on attributes or element refs that React might wipe. */
  const resolveByBid = (bid: string): HTMLElement | null => {
    const meta = candidateMetaRef.current.get(bid);
    const root = containerRef.current;
    if (root && meta) {
      const all = root.getElementsByTagName(meta.tag);
      const el  = all.item(meta.tagIndex) as HTMLElement | null;
      if (el) return el;
    }
    return elementByBidRef.current.get(bid) ?? null;
  };

  /** Toggle via block_id — used by the sidebar checkbox list. */
  const toggleByBid = (bid: string) => {
    const el = resolveByBid(bid);
    if (el) void toggleByElement(el);
  };

  // Scroll the HTML pane to the element with the given block_id and flash
  // it. We use the explicit `htmlPaneRef` to the overflow-y-auto wrapper so
  // we never accidentally scroll the sidebar or the page body.
  const scrollToBid = (bid: string) => {
    const el   = resolveByBid(bid);
    const pane = htmlPaneRef.current;
    if (!el || !pane) return;
    const elRect   = el.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    const target   = pane.scrollTop + (elRect.top - paneRect.top) - 80;
    const clamped  = Math.max(0, Math.min(target, pane.scrollHeight - pane.clientHeight));
    try {
      pane.scrollTo({ top: clamped, behavior: 'smooth' });
    } catch {
      pane.scrollTop = clamped;
    }
    el.classList.add('excl-flash');
    setTimeout(() => el.classList.remove('excl-flash'), 1800);
  };

  // Review-pane controls: remove an existing exclusion, or add a new one for
  // a "kept" candidate that the user wants to mark from the side list.
  const removeBid = (bid: string) => {
    const el = resolveByBid(bid);
    if (el) void toggleByElement(el);
  };
  const addBid = (bid: string) => {
    const el = resolveByBid(bid);
    if (el) void toggleByElement(el);
  };

  const excludedPreviews = candidates.filter((p) => excludedKeys.has(p.target_key));
  const keptPreviews     = candidates.filter((p) => !excludedKeys.has(p.target_key));

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex" onClick={handleCloseRequest}>
      <div
        className="bg-background w-screen h-screen flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border shrink-0">
          <button
            onClick={handleCloseRequest}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              SOP exclusion picker · fullscreen
            </div>
            <h2 className="text-sm font-semibold truncate">{sopTitle}</h2>
          </div>
          {/* Stepper */}
          <div className="inline-flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setStep('pick')}
              className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${
                step === 'pick'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-background text-muted-foreground border-border hover:border-emerald-300'
              }`}
            >
              <span className="font-mono">1</span> Pick
            </button>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setStep('review')}
              className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${
                step === 'review'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-background text-muted-foreground border-border hover:border-emerald-300'
              }`}
            >
              <span className="font-mono">2</span> Review
              {excludedKeys.size > 0 && (
                <span className={`text-[10px] ml-0.5 ${
                  step === 'review' ? 'text-emerald-100' : 'text-rose-700 font-semibold'
                }`}>
                  ({excludedKeys.size})
                </span>
              )}
            </button>
          </div>
          {data?.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
            >
              Open original <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* SIDEBAR — checkbox list (Pick step only). Real React-rendered
              <input> elements: no SOP CSS can hide them. */}
          {step === 'pick' && (
            <aside className="w-[440px] shrink-0 overflow-hidden flex flex-col border-r border-border bg-background">
              <div className="px-3 py-2 border-b border-border bg-emerald-50/60 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-700" />
                <span className="flex-1">
                  <b>Tick the boxes</b> below to mark sections for exclusion.
                </span>
                <span className="text-rose-700 font-semibold">
                  {excludedKeys.size}
                </span>
                <span className="text-muted-foreground">
                  / {candidates.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {loading || !data?.available ? null : candidates.length === 0 ? (
                  <div className="p-6 text-xs text-muted-foreground italic">
                    Extracting sections from the SOP…
                  </div>
                ) : candidates.map((c) => {
                  const isExcluded = excludedKeys.has(c.target_key);
                  return (
                    <div
                      key={c.bid}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleByBid(c.bid)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleByBid(c.bid);
                        }
                      }}
                      className={`group flex items-start gap-3 px-3 py-2 border-b border-border cursor-pointer hover:bg-indigo-50/60 transition-colors ${
                        isExcluded ? 'bg-rose-50/70' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        readOnly
                        tabIndex={-1}
                        aria-label={`Exclude ${c.label}`}
                        className="mt-0.5 h-5 w-5 shrink-0 pointer-events-none"
                        style={{ accentColor: '#f43f5e' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                            isExcluded
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.tag}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              scrollToBid(c.bid);
                            }}
                            className="text-[10px] text-indigo-700 hover:underline ml-auto"
                          >
                            Scroll to →
                          </button>
                        </div>
                        <p className={`text-xs mt-1 break-words ${
                          isExcluded ? 'text-rose-900' : 'text-foreground'
                        }`} style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {c.label || <span className="italic text-muted-foreground">(empty {c.tag})</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* HTML PANE — purely for visual context, read-only. We tint
              excluded blocks rose via the .excl-marked class added by the
              visual sync effect; no DOM injection. */}
          <div
            ref={htmlPaneRef}
            className={`overflow-y-auto bg-white transition-all min-h-0 ${
              step === 'review' ? 'flex-1 border-r border-border' : 'flex-1'
            }`}
          >
            {loading ? (
              <div className="p-10 text-sm text-muted-foreground">Loading source HTML…</div>
            ) : err ? (
              <div className="p-10 text-sm text-destructive">Failed: {err}</div>
            ) : !data?.available ? (
              <div className="p-10 text-sm text-muted-foreground">
                Source HTML unavailable {data?.reason ? `(${data.reason})` : ''}. This SOP was
                ingested from a non-HTTP source (e.g. DOCX upload). Use the <b>List view</b>{' '}
                picker instead.
              </div>
            ) : (
              <>
                <style>{`
                  .sop-readonly, .sop-readonly * { cursor: default; }
                  .sop-readonly table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                  }
                  .sop-readonly table td,
                  .sop-readonly table th {
                    padding: 6px 10px !important;
                    vertical-align: top !important;
                    border-bottom: 1px dashed rgba(148, 163, 184, 0.30) !important;
                  }
                  .sop-readonly .excl-marked {
                    background-color: rgba(244, 63, 94, 0.18) !important;
                    outline: 2px solid #f43f5e !important;
                    outline-offset: 1px;
                    box-shadow: inset 0 0 0 9999px rgba(244, 63, 94, 0.08) !important;
                  }
                  .sop-readonly .excl-flash {
                    animation: exclFlashFs 1200ms ease-out;
                  }
                  @keyframes exclFlashFs {
                    0%   { background-color: rgba(244, 63, 94, 0.50) !important;
                           box-shadow: 0 0 0 6px rgba(244, 63, 94, 0.50) !important; }
                    100% { background-color: rgba(244, 63, 94, 0.18) !important; }
                  }
                `}</style>
                {step === 'review' && (
                  <div className="sticky top-0 z-10 px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-[12px] text-slate-700">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="flex-1">
                      Read-only preview · excluded elements stay highlighted in rose.
                      Use the right panel to remove or add exclusions.
                    </span>
                  </div>
                )}
                <div
                  ref={containerRef}
                  className="sop-readonly px-6 py-5 text-[13.5px] leading-relaxed"
                  key={`${sopId}:${data.html.length}`}
                  dangerouslySetInnerHTML={{ __html: data.html }}
                />
              </>
            )}
          </div>

          {/* REVIEW SIDE PANEL */}
          {step === 'review' && (
            <aside className="w-[440px] shrink-0 overflow-hidden flex flex-col bg-rose-50/20">
              <div className="px-4 py-3 border-b border-border bg-background">
                <h3 className="text-sm font-semibold mb-2">Review your exclusions</h3>
                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[11px] w-full">
                  <button
                    type="button"
                    onClick={() => setReviewTab('excluded')}
                    className={`flex-1 px-3 py-1 rounded inline-flex items-center justify-center gap-1 ${
                      reviewTab === 'excluded'
                        ? 'bg-rose-600 text-white'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Ban className="h-3 w-3" />
                    Excluded ({excludedPreviews.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTab('kept')}
                    className={`flex-1 px-3 py-1 rounded inline-flex items-center justify-center gap-1 ${
                      reviewTab === 'kept'
                        ? 'bg-emerald-600 text-white'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <CheckSquare className="h-3 w-3" />
                    Kept ({keptPreviews.length})
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {reviewTab === 'excluded' && (
                  excludedPreviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-2 py-6">
                      No elements excluded yet. Switch back to <b>Pick</b> and click
                      anything in the SOP to mark it.
                    </p>
                  ) : excludedPreviews.map((p, idx) => (
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
                            onClick={() => scrollToBid(p.bid)}
                            className="text-[10px] text-indigo-700 hover:underline"
                          >
                            Scroll to →
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBid(p.bid)}
                            className="text-[10px] text-emerald-700 hover:underline"
                            title="Remove from exclusions"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                      <p className="text-foreground line-clamp-3 break-words">
                        {p.snippet || p.label || <span className="italic text-muted-foreground">(no text)</span>}
                      </p>
                    </div>
                  ))
                )}
                {reviewTab === 'kept' && (
                  keptPreviews.length === 0 ? (
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
                                onClick={() => scrollToBid(p.bid)}
                                className="text-[10px] text-indigo-700 hover:underline"
                              >
                                Scroll to →
                              </button>
                              <button
                                type="button"
                                onClick={() => addBid(p.bid)}
                                className="text-[10px] text-rose-700 hover:underline"
                                title="Exclude this element"
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
                          Showing the first 200 of {keptPreviews.length} kept candidates.
                        </p>
                      )}
                    </>
                  )
                )}
              </div>
            </aside>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-border bg-background flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            <b>{excludedKeys.size}</b> element{excludedKeys.size === 1 ? '' : 's'} marked
            excluded.{' '}
            {isDirty ? (
              <span className="text-amber-700 font-medium">
                {pendingDiff.count} unsaved change{pendingDiff.count === 1 ? '' : 's'}
                {pendingDiff.toAdd.length > 0 && ` (+${pendingDiff.toAdd.length})`}
                {pendingDiff.toRemove.length > 0 && ` (−${pendingDiff.toRemove.length})`}
                {' '}— click <b>Save</b> to persist.
              </span>
            ) : (
              <span className="text-emerald-700">All changes saved.</span>
            )}
          </p>
          <div className="flex gap-2">
            {step === 'pick' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('review')}
                disabled={loading}
              >
                Review
                {excludedKeys.size > 0 ? ` (${excludedKeys.size})` : ''}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
            {step === 'review' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('pick')}
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to picker
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseRequest}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving || loading}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Picker dialog ────────────────────────────────────────────────────────────

interface RulePickerProps {
  workflowId: string;
  selectedKeys: Set<string>;
  onClose: () => void;
  onSave: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
}

function RulePicker({ workflowId, selectedKeys, onClose, onSave }: RulePickerProps) {
  const [data, setData] = useState<WorkflowAttachable | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'rules' | 'exclusions' | 'tools'>('rules');
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedKeys));
  /** When a tool is picked while a specific rule is focused, remember the
   *  link so we can write it into `AttachedTool.rule_key` on save. The
   *  backend uses this to seed NodeToolBinding.rule_binding. */
  const [pickedToolToRule, setPickedToolToRule] = useState<Map<string, string>>(new Map());
  /** Filter rules by a specific SOP. `null` = show all. */
  const [sopFilter, setSopFilter] = useState<number | null>(null);
  /** Per-row busy state when toggling an exclusion against the backend. */
  const [busyRuleKey, setBusyRuleKey] = useState<string | null>(null);
  /** Currently focused rule/exclusion — drives the source-of-truth side panel. */
  const [focusedRefKey, setFocusedRefKey] = useState<string | null>(null);

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
    workflowsApi.getAttachable(workflowId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [workflowId]);

  // Lazy-load HTML blocks when the user is on the Exclusions tab and has
  // picked a single SOP. We only fetch one SOP at a time to keep the picker
  // responsive even on workflows with many ingested SOPs.
  useEffect(() => {
    if (tab !== 'exclusions' || sopFilter === null) return;
    if (htmlBlocksBySop[sopFilter] !== undefined) return;
    void loadHtmlBlocks(sopFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sopFilter]);

  /** Resolve a rule_key like "step:22:4:0" / "pre:22:88:1" to a
   *  (target_kind, target_key) tuple the SOP-exclusions API understands.
   *  The rule_key itself is already a valid target_key for kind="rule". */
  const ruleKeyToExclusionTarget = (
    rule: AttachableSopRule,
  ): { kind: SopExclusionTargetKind; key: string } => ({
    kind: 'rule', key: rule.key,
  });

  /** Toggle an exclusion on or off via the backend, then re-fetch. */
  const toggleExclusion = async (
    sopId: number,
    kind: SopExclusionTargetKind,
    key: string,
    on: boolean,
    busyRowKey?: string,
    extra?: { label?: string; snippet_text?: string; snippet_is_html?: boolean; section_label?: string },
  ) => {
    if (busyRowKey) setBusyRuleKey(busyRowKey);
    try {
      await sopExclusionsApi.toggle(sopId, {
        target_kind: kind, target_key: key, on,
        ...(extra?.label        ? { label: extra.label }               : {}),
        ...(extra?.snippet_text ? { snippet_text: extra.snippet_text } : {}),
        ...(extra?.snippet_is_html !== undefined || extra?.section_label !== undefined
          ? {
              metadata: {
                ...(extra.snippet_is_html !== undefined ? { snippet_is_html: extra.snippet_is_html } : {}),
                ...(extra.section_label   !== undefined ? { section_label:   extra.section_label   } : {}),
              },
            }
          : {}),
      });
      await refetch();
      // If we mutated an html_block exclusion, refresh the cached list
      // so the checkboxes flip in place.
      if (kind === 'html_block') {
        try {
          const r = await sopExclusionsApi.listHtmlBlocks(sopId);
          setHtmlBlocksBySop((prev) => ({ ...prev, [sopId]: r.blocks }));
        } catch { /* non-fatal */ }
      }
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      if (busyRowKey) setBusyRuleKey(null);
    }
  };

  // ── HTML sections per SOP (deterministically extracted server-side) ──────
  const [htmlBlocksBySop, setHtmlBlocksBySop] = useState<Record<number, SopHtmlBlock[]>>({});
  const [htmlBlocksLoading, setHtmlBlocksLoading] = useState<Record<number, boolean>>({});
  const [htmlBlocksError,  setHtmlBlocksError]  = useState<Record<number, string | null>>({});
  const [htmlBlockQuery,   setHtmlBlockQuery]   = useState('');
  const [htmlBlockKindFilter, setHtmlBlockKindFilter] = useState<string>('all');
  /** Mode for the HTML-section picker inside the Exclusions tab. */
  const [htmlPickMode, setHtmlPickMode] = useState<'list' | 'click'>('click');
  /** When non-null the fullscreen click-to-exclude modal is open for this SOP. */
  const [fullscreenSopId, setFullscreenSopId] = useState<number | null>(null);

  const loadHtmlBlocks = async (sopId: number, force = false) => {
    if (!force && htmlBlocksBySop[sopId]) return;
    setHtmlBlocksLoading((p) => ({ ...p, [sopId]: true }));
    setHtmlBlocksError((p) => ({ ...p, [sopId]: null }));
    try {
      const r = await sopExclusionsApi.listHtmlBlocks(sopId);
      setHtmlBlocksBySop((prev) => ({ ...prev, [sopId]: r.blocks }));
    } catch (e) {
      setHtmlBlocksError((p) => ({ ...p, [sopId]: String((e as Error)?.message ?? e) }));
    } finally {
      setHtmlBlocksLoading((p) => ({ ...p, [sopId]: false }));
    }
  };

  /** All SOPs available for filtering — derived from data.sops if present,
   *  otherwise from the rules themselves so the chip row works even when
   *  the backend doesn't return the convenience list. */
  const availableSops = useMemo(() => {
    if (!data) return [] as { sop_id: number; title: string; narrative: string; ruleCount: number }[];
    const counts = new Map<number, number>();
    for (const r of data.sop_rules) counts.set(r.sop_id, (counts.get(r.sop_id) ?? 0) + 1);
    if (data.sops && data.sops.length > 0) {
      return data.sops.map((s) => ({
        sop_id: s.sop_id, title: s.title, narrative: s.narrative || '',
        ruleCount: counts.get(s.sop_id) ?? 0,
      }));
    }
    const seen = new Map<number, { sop_id: number; title: string; narrative: string; ruleCount: number }>();
    for (const r of data.sop_rules) {
      if (!seen.has(r.sop_id)) {
        seen.set(r.sop_id, { sop_id: r.sop_id, title: r.sop_title, narrative: '', ruleCount: counts.get(r.sop_id) ?? 0 });
      }
    }
    return Array.from(seen.values());
  }, [data]);

  /** Rules grouped first by SOP, then by section.  When `sopFilter` is set,
   *  only that SOP's groups appear. */
  const groupedBySop = useMemo(() => {
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

    const filtered = data.sop_rules.filter((r) =>
      (sopFilter === null || r.sop_id === sopFilter) && matchesQuery(r),
    );

    type Section = { id: string; sectionKey: string; narrative: string; rules: AttachableSopRule[] };
    type SopGroup = { sop_id: number; title: string; narrative: string; sections: Section[] };

    const bySop = new Map<number, SopGroup>();
    for (const r of filtered) {
      let sg = bySop.get(r.sop_id);
      if (!sg) {
        const meta = availableSops.find((s) => s.sop_id === r.sop_id);
        sg = {
          sop_id:    r.sop_id,
          title:     r.sop_title,
          narrative: meta?.narrative || '',
          sections:  [],
        };
        bySop.set(r.sop_id, sg);
      }
      const sectionId = `${r.sop_id}::${r.source}::${r.section_label}`;
      let section = sg.sections.find((s) => s.id === sectionId);
      if (!section) {
        section = {
          id: sectionId,
          sectionKey: `${r.source === 'precondition' ? 'Pre-condition' : 'Decision'} · ${r.section_label}`,
          narrative: r.section_narrative || '',
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
    return data.tool_calls.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q) ||
      t.method.toLowerCase().includes(q));
  }, [data, query]);

  // Index every rule by key so we can resolve `references` transitively.
  const ruleByKey = useMemo(() => {
    const m = new Map<string, AttachableSopRule>();
    if (data) for (const r of data.sop_rules) m.set(r.key, r);
    return m;
  }, [data]);

  /** All exclusions, optionally filtered by SOP + search. */
  const filteredExclusions = useMemo(() => {
    if (!data?.exclusions) return [] as AttachableExclusion[];
    const q = query.trim().toLowerCase();
    return data.exclusions.filter((e) => {
      if (sopFilter !== null && e.sop_id !== sopFilter) return false;
      if (!q) return true;
      return (
        e.label.toLowerCase().includes(q) ||
        (e.condition || '').toLowerCase().includes(q) ||
        (e.action    || '').toLowerCase().includes(q) ||
        e.section_label.toLowerCase().includes(q) ||
        e.sop_title.toLowerCase().includes(q)
      );
    });
  }, [data, query, sopFilter]);

  /** Lookup: exclusion_key → exclusion (so rule cards can resolve `excluded_by`
   *  into the human label / source / sop). */
  const exclusionByKey = useMemo(() => {
    const m = new Map<string, AttachableExclusion>();
    if (data?.exclusions) for (const e of data.exclusions) m.set(e.key, e);
    return m;
  }, [data]);

  /** Focused source-of-truth reference for the side panel. Supports rules,
   *  exclusions, and inline previews of yet-to-be-saved HTML blocks
   *  (prefixed with "htmlblk-preview:" to disambiguate). */
  const focusedRef = useMemo(() => {
    if (!focusedRefKey || !data) return null;
    if (focusedRefKey.startsWith('htmlblk-preview:')) {
      const blockId = focusedRefKey.slice('htmlblk-preview:'.length);
      for (const [sid, list] of Object.entries(htmlBlocksBySop)) {
        const b = list.find((x) => x.block_id === blockId);
        if (b) {
          const sopMeta = data.sops?.find((s) => s.sop_id === Number(sid));
          return {
            title:   sopMeta?.title || `SOP #${sid}`,
            section: b.label,
            ref: {
              source_url:    sopMeta?.source_url || '',
              doc_format:    sopMeta?.doc_format || 'HTML',
              anchor:        b.block_id,
              section_label: b.label,
              snippet_text:  b.text,
              snippet_html:  b.html,
            },
          };
        }
      }
      return null;
    }
    const r = ruleByKey.get(focusedRefKey);
    if (r?.html_reference) {
      return { title: r.sop_title, section: r.section_label, ref: r.html_reference };
    }
    const e = exclusionByKey.get(focusedRefKey);
    if (e?.html_reference) {
      return { title: e.sop_title, section: e.section_label, ref: e.html_reference };
    }
    return null;
  }, [focusedRefKey, data, ruleByKey, exclusionByKey, htmlBlocksBySop]);

  /** Walk the `references` graph from `start`, collecting every reachable key. */
  const expandReferences = (start: string): string[] => {
    const visited = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const k = stack.pop()!;
      if (visited.has(k)) continue;
      visited.add(k);
      const r = ruleByKey.get(k);
      if (r?.references?.length) {
        for (const ref of r.references) if (!visited.has(ref)) stack.push(ref);
      }
    }
    return Array.from(visited);
  };

  const toggle = (key: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Deselect just this one — don't surprise the user by cascading off.
        next.delete(key);
      } else {
        // Select this + everything it transitively depends on.
        for (const k of expandReferences(key)) next.add(k);
      }
      return next;
    });
    // If we toggled a tool off, drop its rule linkage too.
    if (key.startsWith('tool:') || key.startsWith('agent:')) {
      setPickedToolToRule((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
  };

  /** Pick a tool AND remember which rule was focused at the time so the
   *  NodeToolBinding gets a non-null rule_binding pointer on save. */
  const toggleToolForRule = (toolKey: string, ruleKey: string | null) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) next.delete(toolKey);
      else next.add(toolKey);
      return next;
    });
    setPickedToolToRule((prev) => {
      const next = new Map(prev);
      if (ruleKey && picked.has(toolKey) === false) next.set(toolKey, ruleKey);
      else if (!ruleKey) next.delete(toolKey);
      return next;
    });
  };

  const handleSave = () => {
    if (!data) return;
    const rules: AttachedSopRule[] = data.sop_rules
      .filter((r) => picked.has(r.key))
      .map((r) => ({
        key: r.key,
        sop_id: r.sop_id,
        sop_title: r.sop_title,
        source: r.source,
        section_label: r.section_label,
        section_narrative: r.section_narrative || '',
        condition: r.condition,
        action: r.action,
        decision_type: r.decision_type,
        codes: r.codes,
      }));
    const tools: AttachedTool[] = data.tool_calls
      .filter((t) => picked.has(t.key))
      .map((t) => {
        // For each tool picked, see if the user also focused a specific
        // rule so the binding gets a rule_binding_id once it lands in the
        // DB (NodeToolBinding.rule_binding).
        const linkedRule = pickedToolToRule.get(t.key) ?? null;
        return {
          key:             t.key,
          tool_id:         t.tool_id,
          tool_kind:       (t.tool_kind || t.kind) as AttachedTool['tool_kind'],
          display_name:    t.display_name || t.name,
          description:     t.description,
          args_schema:     t.args_schema,
          endpoint_id:     t.endpoint_id || '',
          name:            t.name,
          method:          t.method || (t.tool_kind === 'api_agent' ? 'GET' : 'POST'),
          url:             t.url || t.invoke_url || '',
          rule_key:        linkedRule,
          rule_binding_id: null,
        };
      });
    onSave(rules, tools);
    onClose();
  };

  const ruleCount = useMemo(
    () => Array.from(picked).filter((k) => k.startsWith('pre:') || k.startsWith('step:')).length,
    [picked],
  );
  const toolCount = useMemo(
    () =>
      Array.from(picked).filter(
        (k) => k.startsWith('agent:') || k.startsWith('tool:'),
      ).length,
    [picked],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Attach rules &amp; tools to this node</h2>
          <button onClick={onClose}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs + search */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
            <button onClick={() => setTab('rules')}
                    className={`px-3 py-1 rounded ${tab === 'rules' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              SOP Rules {data && <span className="text-[10px] text-muted-foreground">({data.sop_rules.length})</span>}
            </button>
            <button onClick={() => setTab('exclusions')}
                    className={`px-3 py-1 rounded inline-flex items-center gap-1 ${tab === 'exclusions' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              <Ban className="h-3 w-3" />
              Exclusions {data?.exclusions && <span className="text-[10px] text-muted-foreground">({data.exclusions.length})</span>}
            </button>
            <button onClick={() => setTab('tools')}
                    className={`px-3 py-1 rounded ${tab === 'tools' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              Tool Calls {data && <span className="text-[10px] text-muted-foreground">({data.tool_calls.length})</span>}
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === 'rules' ? 'Search rules, sections, codes…'
                : tab === 'exclusions' ? 'Search exclusions…'
                : 'Search tools…'
              }
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* SOP filter chips — on rules + exclusions tabs when ≥ 1 SOP is linked */}
        {data && (tab === 'rules' || tab === 'exclusions') && availableSops.length > 0 && (
          <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 mr-1">
              SOP
            </span>
            <button
              type="button"
              onClick={() => setSopFilter(null)}
              className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
                sopFilter === null
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-background border-border text-muted-foreground hover:border-indigo-300'
              }`}
            >
              All ({data.sop_rules.length})
            </button>
            {availableSops.map((s) => {
              const active = sopFilter === s.sop_id;
              return (
                <button
                  key={s.sop_id}
                  type="button"
                  title={s.narrative || s.title}
                  onClick={() => setSopFilter(active ? null : s.sop_id)}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap max-w-[260px] transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-background border-border text-foreground hover:border-indigo-300'
                  }`}
                >
                  <BookOpen className="h-3 w-3 shrink-0" />
                  <span className="truncate">{s.title}</span>
                  <span className={`text-[10px] ${active ? 'text-indigo-100' : 'text-muted-foreground'}`}>
                    ({s.ruleCount})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {err && <div className="p-4 text-sm text-destructive">Failed: {err}</div>}
          {!data && !err && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}

          {data && tab === 'rules' && (
            <div className="divide-y divide-border">
              {groupedBySop.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No matching rules. {availableSops.length === 0
                    ? 'Attach an SOP to this workflow first.'
                    : 'Try a different SOP or search term.'}
                </div>
              )}
              {groupedBySop.map((sop) => (
                <div key={sop.sop_id}>
                  {/* SOP header — one per SOP, sticky */}
                  <div className="px-4 py-2 bg-indigo-50/60 sticky top-0 z-20 border-b border-indigo-100 flex items-start gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-indigo-900 truncate">{sop.title}</p>
                      {sop.narrative && (
                        <p className="text-[11px] text-indigo-900/70 italic mt-0.5 line-clamp-2">
                          {sop.narrative}
                        </p>
                      )}
                    </div>
                  </div>

                  {sop.sections.map((g) => (
                    <div key={g.id}>
                      <div className="px-4 py-1.5 bg-muted/30 sticky top-[52px] z-10 flex items-center gap-2 border-b border-border/60">
                        {g.sectionKey.startsWith('Pre-condition')
                          ? <ShieldCheck className="h-3 w-3 text-amber-600" />
                          : <GitBranch className="h-3 w-3 text-blue-600" />}
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {g.sectionKey}
                        </span>
                      </div>
                      {g.narrative && (
                        <p className="px-4 pt-2 pb-1.5 text-[11px] leading-snug text-muted-foreground italic bg-muted/10 border-b border-border">
                          {g.narrative}
                        </p>
                      )}
                      {g.rules.map((r) => {
                        const isSelected = picked.has(r.key);
                        const excludedBy = r.excluded_by ?? [];
                        const isExcluded = excludedBy.length > 0 || r.is_exclusion === true;
                        const isUserExcluded = excludedBy.some(
                          (k) => k.startsWith('user-excl:'),
                        );
                        const isBusy = busyRuleKey === r.key;
                        return (
                          <div
                            key={r.key}
                            className={`px-4 py-2 transition-colors flex items-start gap-3 border-b border-border/40 ${isSelected ? 'bg-blue-50/40' : ''} ${isExcluded ? 'opacity-70' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => toggle(r.key)}
                              className="mt-0.5 shrink-0"
                              aria-label={isSelected ? 'Deselect rule' : 'Select rule'}
                            >
                              <input
                                type="checkbox" checked={isSelected} readOnly
                                className="h-3.5 w-3.5 rounded border-input"
                              />
                            </button>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(r.key)}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[r.decision_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                  {r.decision_type || '—'}
                                </span>
                                {r.codes.slice(0, 4).map((c) => (
                                  <span key={c} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {c}
                                  </span>
                                ))}
                                {r.references.length > 0 && (
                                  <span
                                    title={`Picking this will also attach ${r.references.length} linked rule${r.references.length === 1 ? '' : 's'}${r.goto_step !== null ? ` (Step ${r.goto_step})` : ''}.`}
                                    className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  >
                                    <Link2 className="h-2.5 w-2.5" />
                                    +{r.references.length} linked
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
                                  <span className="text-muted-foreground font-medium">If </span>
                                  {r.condition}
                                </p>
                              )}
                              {r.action && (
                                <p className="text-[11px] mt-0.5">
                                  <span className="text-muted-foreground font-medium">Then </span>
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
                                        {ex?.source === 'user' ? '◯ ' : '⚐ '}
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
                                    setFocusedRefKey(focusedRefKey === r.key ? null : r.key);
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
                                disabled={isBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const t = ruleKeyToExclusionTarget(r);
                                  toggleExclusion(r.sop_id, t.kind, t.key, !isUserExcluded, r.key);
                                }}
                                title={isUserExcluded ? 'Remove this exclusion' : 'Mark this rule as excluded for the SOP'}
                                className={`h-6 px-2 inline-flex items-center gap-1 rounded text-[10px] border ${
                                  isUserExcluded
                                    ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                                    : 'bg-background border-border text-muted-foreground hover:text-rose-700 hover:border-rose-300'
                                } ${isBusy ? 'opacity-50' : ''}`}
                              >
                                <Ban className="h-3 w-3" />
                                {isUserExcluded ? 'Excluded' : 'Exclude'}
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
          )}

          {data && tab === 'exclusions' && (
            <div className="divide-y divide-border">
              {/* HTML SECTIONS PANEL — visible when a single SOP is selected */}
              {sopFilter !== null && (() => {
                const allBlocks   = htmlBlocksBySop[sopFilter] ?? [];
                const loading     = htmlBlocksLoading[sopFilter];
                const loadErr     = htmlBlocksError[sopFilter];
                const availableKinds = Array.from(
                  new Set(allBlocks.map((b) => b.kind))
                ).sort();
                const q = htmlBlockQuery.trim().toLowerCase();
                const blocks = allBlocks.filter((b) => {
                  if (htmlBlockKindFilter !== 'all' && b.kind !== htmlBlockKindFilter) return false;
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
                      {/* Mode toggle: click directly on the rendered HTML vs.
                          pick from the server-extracted block list. */}
                      <div className="inline-flex rounded-md border border-emerald-300/60 bg-background p-0.5 text-[10px] ml-2">
                        <button
                          type="button"
                          onClick={() => setHtmlPickMode('click')}
                          className={`px-2 py-0.5 rounded ${htmlPickMode === 'click' ? 'bg-emerald-600 text-white' : 'text-muted-foreground'}`}
                        >
                          Click HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => setHtmlPickMode('list')}
                          className={`px-2 py-0.5 rounded ${htmlPickMode === 'list' ? 'bg-emerald-600 text-white' : 'text-muted-foreground'}`}
                        >
                          List view
                        </button>
                      </div>
                      <span className="ml-auto text-muted-foreground text-[10px]">
                        {htmlPickMode === 'list'
                          ? (loading ? 'Loading…' :
                              allBlocks.length === 0 ? '(no extractable sections)' :
                              `${allBlocks.length} section${allBlocks.length === 1 ? '' : 's'} extracted`)
                          : 'click any element below to toggle'}
                      </span>
                      {htmlPickMode === 'list' && (
                        <button
                          type="button"
                          onClick={() => loadHtmlBlocks(sopFilter, true)}
                          className="text-[10px] text-indigo-700 hover:text-indigo-800"
                        >
                          Reload
                        </button>
                      )}
                    </div>
                    {htmlPickMode === 'click' && (() => {
                      // Count of existing user-curated html_block exclusions
                      // for this SOP — purely informational on the launcher.
                      const htmlExclCount = (data?.exclusions ?? []).filter(
                        (e) => e.sop_id === sopFilter
                            && e.source === 'user'
                            && (e.rule_kind === 'html_block' || e.target_kind === 'html_block'),
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
                            Opens the SOP in a fullscreen picker. <b>Click any element</b> —
                            tables, rows, cells, headings, paragraphs — to mark it like a
                            tick box. The next screen lets you <b>review</b> everything you've
                            excluded (and what you've kept) before closing.
                          </p>
                          <Button
                            size="default"
                            onClick={() => setFullscreenSopId(sopFilter)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Maximize2 className="mr-1.5 h-4 w-4" />
                            Open fullscreen picker
                          </Button>
                          {htmlExclCount > 0 && (
                            <p className="text-[11px] text-rose-700">
                              {htmlExclCount} HTML element
                              {htmlExclCount === 1 ? '' : 's'} already excluded for this SOP.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    {htmlPickMode === 'list' && loadErr && (
                      <div className="px-4 py-2 text-[11px] text-destructive">
                        Failed to load HTML sections: {loadErr}
                      </div>
                    )}
                    {htmlPickMode === 'list' && !loading && allBlocks.length > 0 && (
                      <div className="px-4 py-2 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-muted-foreground">Filter:</span>
                        <button
                          type="button"
                          onClick={() => setHtmlBlockKindFilter('all')}
                          className={`px-2 py-0.5 rounded border ${
                            htmlBlockKindFilter === 'all'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-background border-border text-muted-foreground'
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
                              onClick={() => setHtmlBlockKindFilter(active ? 'all' : k)}
                              className={`px-2 py-0.5 rounded border capitalize ${
                                active
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-background border-border text-muted-foreground'
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
                    {htmlPickMode === 'list' && (
                    <div className="divide-y divide-emerald-100/70 max-h-[40vh] overflow-y-auto">
                      {blocks.map((b) => {
                        const isBusy = busyRuleKey === `htmlblk:${b.block_id}`;
                        return (
                          <label
                            key={b.block_id}
                            className={`px-4 py-1.5 flex items-start gap-3 hover:bg-emerald-50 cursor-pointer ${b.is_excluded ? 'bg-rose-50/30' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={b.is_excluded}
                              disabled={isBusy}
                              onChange={(e) =>
                                toggleExclusion(
                                  sopFilter,
                                  'html_block',
                                  b.target_key,
                                  e.target.checked,
                                  `htmlblk:${b.block_id}`,
                                  {
                                    label:           b.label,
                                    snippet_text:    b.html,
                                    snippet_is_html: true,
                                    section_label:   b.label,
                                  },
                                )
                              }
                              className="mt-1 h-3.5 w-3.5 rounded border-input shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${
                                  b.kind === 'heading'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  b.kind === 'table'     ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  b.kind === 'list'      ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  b.kind === 'callout'   ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  b.kind === 'code'      ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                  b.kind === 'metadata'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                           'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {b.tag} · {b.kind}
                                </span>
                                {b.is_excluded && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5">
                                    <Ban className="h-2.5 w-2.5" /> Excluded
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] mt-0.5 truncate">{b.label}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                const k = `htmlblk-preview:${b.block_id}`;
                                setFocusedRefKey(focusedRefKey === k ? null : k);
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
                  No exclusions yet. Switch to the <b>SOP Rules</b> tab and click
                  the <Ban className="inline h-3 w-3 align-text-bottom" /> <b>Exclude</b> button
                  on any rule, or pick HTML sections above.
                </div>
              )}
              {filteredExclusions.map((e) => {
                const isUser = e.source === 'user';
                const isBusy = busyRuleKey === e.key;
                return (
                  <div key={e.key} className="px-4 py-2 flex items-start gap-3">
                    <Ban className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isUser ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${
                          isUser
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isUser ? 'User-marked' : 'From SOP'}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {e.sop_title} · {e.section_label}
                        </span>
                        {e.overrides_rule_keys.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            Affects {e.overrides_rule_keys.length} rule{e.overrides_rule_keys.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-medium mt-1 truncate">
                        {e.label || e.condition || e.target_key}
                      </p>
                      {e.action && e.action !== '(excluded by auditor)' && (
                        <p className="text-[11px] mt-0.5">
                          <span className="text-muted-foreground font-medium">Then </span>{e.action}
                        </p>
                      )}
                      {e.reason && (
                        <p className="text-[11px] mt-0.5 italic text-muted-foreground">
                          “{e.reason}”
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-1 items-end">
                      {e.html_reference && (
                        <button
                          type="button"
                          onClick={() => setFocusedRefKey(focusedRefKey === e.key ? null : e.key)}
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
                            toggleExclusion(e.sop_id, e.target_kind!, e.target_key!, false, e.key)
                          }
                          title="Remove this exclusion"
                          className={`h-6 px-2 inline-flex items-center gap-1 rounded text-[10px] border bg-background border-border text-muted-foreground hover:text-rose-700 hover:border-rose-300 ${isBusy ? 'opacity-50' : ''}`}
                        >
                          <X className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data && tab === 'tools' && (
            <div>
              {/* Hint banner — explains the rule_binding linkage when a rule
                  is focused in the side panel (focusedRefKey) so the user
                  knows clicking a tool will associate it with that rule. */}
              {focusedRefKey && ruleByKey.has(focusedRefKey) && (
                <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 text-[11px] text-indigo-900 flex items-center gap-2">
                  <Wrench className="h-3 w-3" />
                  Tools you tick now will be linked to rule
                  <code className="px-1 py-0.5 rounded bg-white/60 border border-indigo-200 text-[10px]">
                    {focusedRefKey}
                  </code>
                  (NodeToolBinding.rule_binding) on save.
                </div>
              )}
              <div className="divide-y divide-border">
                {filteredTools.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No tools available. Wait for the agent_tools registry
                    to seed (or attach runtime API agents via the workflow
                    context panel).
                  </div>
                )}
                {filteredTools.map((t) => {
                  const isSelected = picked.has(t.key);
                  const isLangchain = (t.tool_kind || t.kind) === 'langchain';
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => toggleToolForRule(
                        t.key,
                        focusedRefKey && ruleByKey.has(focusedRefKey)
                          ? focusedRefKey
                          : null,
                      )}
                      className={`w-full text-left px-4 py-2 hover:bg-muted/40 transition-colors flex items-start gap-3 ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-0.5 h-3.5 w-3.5 rounded border-input shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isLangchain
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isLangchain ? 'LANGCHAIN' : (t.method || 'AGENT')}
                          </span>
                          <span className="text-xs font-medium truncate">
                            {t.display_name || t.name || '(unnamed)'}
                          </span>
                          {pickedToolToRule.has(t.key) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                              for {pickedToolToRule.get(t.key)}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                          {t.invoke_url || t.url}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Focused source-of-truth panel (slides up from above the footer) */}
        {focusedRef && (
          <div className="border-t border-border bg-amber-50/40 max-h-[28vh] overflow-y-auto">
            <div className="px-4 py-2 border-b border-amber-200/60 flex items-center gap-2 sticky top-0 bg-amber-50/80 backdrop-blur">
              <FileWarning className="h-3.5 w-3.5 text-amber-700" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">
                  {focusedRef.title} <span className="text-muted-foreground font-normal">· {focusedRef.section}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {focusedRef.ref.doc_format} · anchor <span className="font-mono">{focusedRef.ref.anchor}</span>
                </p>
              </div>
              {focusedRef.ref.source_url && (
                <a
                  href={focusedRef.ref.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-800"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setFocusedRefKey(null)}
                className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-amber-100 text-muted-foreground"
                aria-label="Hide source"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="px-4 py-2 text-[12px] leading-snug">
              {focusedRef.ref.snippet_html ? (
                <div
                  className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1"
                  dangerouslySetInnerHTML={{ __html: focusedRef.ref.snippet_html }}
                />
              ) : focusedRef.ref.snippet_text ? (
                <p className="whitespace-pre-wrap">{focusedRef.ref.snippet_text}</p>
              ) : (
                <p className="italic text-muted-foreground">No snippet captured for this reference.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {ruleCount} rule{ruleCount === 1 ? '' : 's'} · {toolCount} tool{toolCount === 1 ? '' : 's'} selected
            {data?.exclusions && data.exclusions.length > 0 && (
              <span className="ml-2 text-rose-700">
                · {data.exclusions.filter((e) => e.source === 'user').length} user exclusion(s)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save attachments</Button>
          </div>
        </div>
      </div>

      {/* Fullscreen "Click HTML to exclude" picker — opens above the RulePicker
          dialog. The stopPropagation wrapper prevents backdrop clicks inside
          the fullscreen modal from bubbling to the RulePicker's own backdrop
          (which would close both modals at once). */}
      {fullscreenSopId !== null && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <HtmlClickFullscreenModal
            sopId={fullscreenSopId}
            sopTitle={
              availableSops.find((s) => s.sop_id === fullscreenSopId)?.title
                ?? `SOP #${fullscreenSopId}`
            }
            onClose={() => {
              setFullscreenSopId(null);
              void refetch();
            }}
            onChanged={() => { void refetch(); }}
          />
        </div>
      )}
    </div>
  );
}

// ── Attached rule card (chip + collapsible narrative) ────────────────────────

function AttachedRuleCard({
  rule, onRemove,
}: { rule: AttachedSopRule; onRemove: (key: string) => void }) {
  const [showCtx, setShowCtx] = useState(false);
  return (
    <li className="border border-border rounded p-2 bg-muted/30">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[rule.decision_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {rule.decision_type || '—'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {rule.section_label}
            </span>
            {rule.codes.slice(0, 3).map((c) => (
              <span key={c} className="font-mono text-[10px] px-1 rounded bg-slate-100 text-slate-700">
                {c}
              </span>
            ))}
          </div>
          {rule.condition && (
            <p className="text-[11px] leading-snug">
              <span className="text-muted-foreground">If </span>{rule.condition}
            </p>
          )}
          {rule.action && (
            <p className="text-[11px] leading-snug">
              <span className="text-muted-foreground">Then </span>{rule.action}
            </p>
          )}
          {rule.section_narrative && (
            <>
              <button
                type="button"
                onClick={() => setShowCtx((v) => !v)}
                className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-700"
              >
                {showCtx ? 'Hide context' : 'Why this rule?'}
              </button>
              {showCtx && (
                <p className="mt-1 text-[11px] leading-snug italic text-muted-foreground border-l-2 border-indigo-300 pl-2">
                  {rule.section_narrative}
                </p>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(rule.key)}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}

// ── Inline editor (chips + open-picker button) ───────────────────────────────

interface NodeAttachmentsProps {
  workflowId: string;
  rules: AttachedSopRule[];
  tools: AttachedTool[];
  onChange: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
}

export default function NodeAttachments({
  workflowId, rules, tools, onChange,
}: NodeAttachmentsProps) {
  const [open, setOpen] = useState(false);

  const removeRule = (key: string) => onChange(rules.filter((r) => r.key !== key), tools);
  const removeTool = (key: string) => onChange(rules, tools.filter((t) => t.key !== key));

  const selectedKeys = useMemo(
    () => new Set<string>([...rules.map((r) => r.key), ...tools.map((t) => t.key)]),
    [rules, tools],
  );

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            SOP Rules
          </label>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"
                  onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Pick rules &amp; tools
          </Button>
        </div>

        {rules.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No rules attached. Click "Pick" to select lines from any SOP linked to this workflow.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rules.map((r) => (
              <AttachedRuleCard key={r.key} rule={r} onRemove={removeRule} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Wrench className="h-3 w-3" />
          Tool Calls
        </label>
        {tools.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No tools attached.
          </p>
        ) : (
          <GroupedToolsList
            tools={tools}
            rules={rules}
            onRemove={removeTool}
          />
        )}
      </div>

      {open && (
        <RulePicker
          workflowId={workflowId}
          selectedKeys={selectedKeys}
          onClose={() => setOpen(false)}
          onSave={(r, t) => onChange(r, t)}
        />
      )}
    </>
  );
}

// ── Grouped tools list (per the plan's rule_binding grouping) ────────────────
// Tools attached via the registry remember which rule they were picked
// alongside (`rule_key` / `rule_binding_id`). Render them grouped under the
// rule's section_label; orphan tools (no rule link) collapse into "Other".

interface GroupedToolsListProps {
  tools:   AttachedTool[];
  rules:   AttachedSopRule[];
  onRemove:(key: string) => void;
}

function GroupedToolsList({ tools, rules, onRemove }: GroupedToolsListProps) {
  const ruleLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rules) {
      m.set(r.key, r.section_label || r.key);
    }
    return m;
  }, [rules]);

  // Preserve insertion order of unique group keys so the list stays stable
  // across re-renders.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byKey = new Map<string, AttachedTool[]>();
    for (const t of tools) {
      const groupKey = t.rule_key || '__other__';
      if (!byKey.has(groupKey)) {
        byKey.set(groupKey, []);
        order.push(groupKey);
      }
      byKey.get(groupKey)!.push(t);
    }
    return order.map((key) => ({
      key,
      label:
        key === '__other__'
          ? 'Other'
          : ruleLabelByKey.get(key) || `Rule ${key}`,
      tools: byKey.get(key)!,
    }));
  }, [tools, ruleLabelByKey]);

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.key} className="space-y-1">
          <p
            className={`text-[10px] uppercase tracking-wide font-semibold ${
              group.key === '__other__'
                ? 'text-muted-foreground'
                : 'text-indigo-700'
            }`}
          >
            {group.label}
            <span className="ml-1.5 text-muted-foreground font-normal lowercase">
              {group.tools.length} tool{group.tools.length === 1 ? '' : 's'}
            </span>
          </p>
          <ul className="space-y-1.5">
            {group.tools.map((t) => {
              const isLangchain = (t.tool_kind || 'api_agent') === 'langchain';
              return (
                <li
                  key={t.key}
                  className="border border-border rounded p-2 bg-muted/30 flex items-center gap-2"
                >
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isLangchain
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isLangchain ? 'LC' : (t.method || 'AGENT')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">
                      {t.display_name || t.name || '(unnamed)'}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {t.url || t.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(t.key)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
