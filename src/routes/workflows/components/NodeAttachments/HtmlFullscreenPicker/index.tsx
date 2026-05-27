import { useEffect, useMemo, useRef, useState } from "react";
import { X, ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sopExclusionsApi, htmlBlockId } from "@/lib/api";
import { useCandidateExtraction } from "./useCandidateExtraction";
import PickerSidebar from "./PickerSidebar";
import HtmlPane from "./HtmlPane";
import ReviewPanel from "./ReviewPanel";

type FullscreenStep = "pick" | "review";

interface HtmlClickFullscreenModalProps {
  sopId: number;
  sopTitle: string;
  onClose: () => void;
  onChanged?: () => void;
  readOnly?: boolean;
}

export default function HtmlClickFullscreenModal({
  sopId,
  sopTitle,
  onClose,
  onChanged,
  readOnly = false,
}: HtmlClickFullscreenModalProps) {
  const [step, setStep] = useState<FullscreenStep>("pick");
  const [data, setData] =
    useState<Parameters<typeof useCandidateExtraction>[1]>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [reviewTab, setReviewTab] = useState<"excluded" | "kept">("excluded");
  const [saving, setSaving] = useState(false);

  // Server state at load time. We diff against this on Save to know what
  // to add and remove. Updated only after a successful save round-trip.
  const initialExcludedRef = useRef<Set<string>>(new Set());
  // bid → {label, html} for items toggled ON during this session.
  const pendingMetaRef = useRef<Map<string, { label: string; html: string }>>(
    new Map(),
  );
  const busyRef = useRef(false);

  // DOM refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const htmlPaneRef = useRef<HTMLDivElement | null>(null);

  // Candidate extraction hook (hashing, refs, resolveByBid)
  const {
    candidates,
    setCandidates,
    hashesReady,
    snapshotRef,
    hashRef,
    candidateMetaRef,
    elementByBidRef,
    resolveByBid,
  } = useCandidateExtraction(containerRef, data, sopId);

  // Fetch sanitized source HTML once per SOP.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    setExcludedKeys(new Set());
    pendingMetaRef.current = new Map();
    initialExcludedRef.current = new Set();
    sopExclusionsApi
      .getSourceHtml(sopId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        const initial = new Set(d.excluded_target_keys || []);
        initialExcludedRef.current = initial;
        setExcludedKeys(new Set(initial));
      })
      .catch((e) => {
        if (!cancelled) setErr(String((e as Error)?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sopId]);

  // Paint .excl-marked on every candidate whose hash is in excludedKeys.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root
      .querySelectorAll(".excl-marked")
      .forEach((el) => el.classList.remove("excl-marked"));
    for (const tk of excludedKeys) {
      if (!tk.startsWith(`html:${sopId}:`)) continue;
      const bid = tk.slice(`html:${sopId}:`.length);
      const meta = candidateMetaRef.current.get(bid);
      if (!meta) continue;
      const live = root
        .getElementsByTagName(meta.tag)
        .item(meta.tagIndex) as HTMLElement | null;
      if (live) live.classList.add("excl-marked");
    }
  }, [excludedKeys, hashesReady, sopId, step, candidateMetaRef]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape key — use a stable ref so we don't rebind on every render.
  const handleCloseRequestRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseRequestRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // LOCAL toggle — never touches the server.
  const toggleByElement = async (el: HTMLElement) => {
    if (readOnly || busyRef.current) return;
    const html = snapshotRef.current.get(el) || el.outerHTML;
    if (!html) return;
    const text = (el.textContent || "").trim();
    const label = (text || el.tagName.toLowerCase()).slice(0, 200);
    busyRef.current = true;
    try {
      const bid = hashRef.current.get(el) || (await htmlBlockId(html));
      if (!hashRef.current.has(el)) {
        const tag = el.tagName.toLowerCase();
        const sameTag = containerRef.current
          ? Array.from(containerRef.current.getElementsByTagName(tag))
          : [];
        const tagIndex = Math.max(0, sameTag.indexOf(el));
        hashRef.current.set(el, bid);
        elementByBidRef.current.set(bid, el);
        candidateMetaRef.current.set(bid, { tag, tagIndex });
        setCandidates((prev) =>
          prev.some((p) => p.bid === bid)
            ? prev
            : [
                ...prev,
                {
                  bid,
                  label,
                  target_key: `html:${sopId}:${bid}`,
                  tag,
                  tagIndex,
                  snippet: text.slice(0, 240),
                },
              ],
        );
      }
      const tk = `html:${sopId}:${bid}`;
      pendingMetaRef.current.set(bid, { label, html });
      setExcludedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(tk)) next.delete(tk);
        else next.add(tk);
        return next;
      });
      el.classList.add("excl-flash");
      setTimeout(() => el.classList.remove("excl-flash"), 900);
    } catch (ex) {
      setErr(String((ex as Error)?.message ?? ex));
    } finally {
      busyRef.current = false;
    }
  };

  const toggleByBid = (bid: string) => {
    const el = resolveByBid(bid);
    if (el) void toggleByElement(el);
  };

  const scrollToBid = (bid: string) => {
    const el = resolveByBid(bid);
    const pane = htmlPaneRef.current;
    if (!el || !pane) return;
    const elRect = el.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    const target = pane.scrollTop + (elRect.top - paneRect.top) - 80;
    const clamped = Math.max(
      0,
      Math.min(target, pane.scrollHeight - pane.clientHeight),
    );
    try {
      pane.scrollTo({ top: clamped, behavior: "smooth" });
    } catch {
      pane.scrollTop = clamped;
    }
    el.classList.add("excl-flash");
    setTimeout(() => el.classList.remove("excl-flash"), 1800);
  };

  // Symmetric diff: what changed vs. the initial server state.
  const pendingDiff = useMemo(() => {
    const initial = initialExcludedRef.current;
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    for (const k of excludedKeys) if (!initial.has(k)) toAdd.push(k);
    for (const k of initial) if (!excludedKeys.has(k)) toRemove.push(k);
    return { toAdd, toRemove, count: toAdd.length + toRemove.length };
    // hashesReady triggers re-evaluation once async hashing finishes so
    // pre-existing keys align with discovered candidates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludedKeys, hashesReady]);

  const isDirty = pendingDiff.count > 0;

  const snippetForKey = (tk: string): { label: string; html: string } => {
    const bid = tk.startsWith(`html:${sopId}:`)
      ? tk.slice(`html:${sopId}:`.length)
      : tk;
    const fresh = pendingMetaRef.current.get(bid);
    if (fresh) return fresh;
    const live = resolveByBid(bid);
    if (live) {
      const h = snapshotRef.current.get(live) || live.outerHTML;
      const text = (live.textContent || "").trim();
      return {
        label: (text || live.tagName.toLowerCase()).slice(0, 200),
        html: h,
      };
    }
    const cand = candidates.find((c) => c.bid === bid);
    if (cand) return { label: cand.label, html: cand.snippet };
    return { label: bid, html: "" };
  };

  const handleSave = async () => {
    if (readOnly || saving) return;
    setSaving(true);
    setErr(null);
    try {
      for (const tk of pendingDiff.toRemove) {
        await sopExclusionsApi.toggle(sopId, {
          target_kind: "html_block",
          target_key: tk,
          on: false,
        });
      }
      for (const tk of pendingDiff.toAdd) {
        const { label, html } = snippetForKey(tk);
        await sopExclusionsApi.toggle(sopId, {
          target_kind: "html_block",
          target_key: tk,
          on: true,
          label,
          snippet_text: html,
          metadata: { snippet_is_html: true, section_label: label },
        });
      }
      initialExcludedRef.current = new Set(excludedKeys);
      pendingMetaRef.current = new Map();
      onChanged?.();
      onClose();
    } catch (ex) {
      setErr(String((ex as Error)?.message ?? ex));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseRequest = () => {
    if (!readOnly && isDirty && !saving) {
      const ok = window.confirm(
        `You have ${pendingDiff.count} unsaved change` +
          `${pendingDiff.count === 1 ? "" : "s"}. Discard and close?`,
      );
      if (!ok) return;
    }
    onClose();
  };
  // Keep the ref in sync so the Escape effect always sees the latest version.
  handleCloseRequestRef.current = handleCloseRequest;

  const excludedPreviews = candidates.filter((p) =>
    excludedKeys.has(p.target_key),
  );
  const keptPreviews = candidates.filter(
    (p) => !excludedKeys.has(p.target_key),
  );

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 flex"
      onClick={handleCloseRequest}
    >
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
            {readOnly && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Read-only preview — exclusions cannot be changed.
              </p>
            )}
          </div>
          {/* Stepper */}
          <div className="inline-flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setStep("pick")}
              className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${
                step === "pick"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-background text-muted-foreground border-border hover:border-emerald-300"
              }`}
            >
              <span className="font-mono">1</span> Pick
            </button>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setStep("review")}
              className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${
                step === "review"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-background text-muted-foreground border-border hover:border-emerald-300"
              }`}
            >
              <span className="font-mono">2</span> Review
              {excludedKeys.size > 0 && (
                <span
                  className={`text-[10px] ml-0.5 ${
                    step === "review"
                      ? "text-emerald-100"
                      : "text-rose-700 font-semibold"
                  }`}
                >
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
          {step === "pick" && (
            <PickerSidebar
              candidates={candidates}
              excludedKeys={excludedKeys}
              loading={loading}
              dataAvailable={data?.available}
              readOnly={readOnly}
              onToggle={toggleByBid}
              onScrollTo={scrollToBid}
            />
          )}

          <HtmlPane
            htmlPaneRef={htmlPaneRef}
            containerRef={containerRef}
            step={step}
            loading={loading}
            err={err}
            data={data}
            sopId={sopId}
          />

          {step === "review" && (
            <ReviewPanel
              excludedPreviews={excludedPreviews}
              keptPreviews={keptPreviews}
              reviewTab={reviewTab}
              readOnly={readOnly}
              onSetReviewTab={setReviewTab}
              onScrollTo={scrollToBid}
              onToggleBid={toggleByBid}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-border bg-background flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            <b>{excludedKeys.size}</b> element
            {excludedKeys.size === 1 ? "" : "s"} marked excluded.
            {readOnly ? (
              <span className="text-muted-foreground"> Read-only preview.</span>
            ) : isDirty ? (
              <span className="text-amber-700 font-medium">
                {pendingDiff.count} unsaved change
                {pendingDiff.count === 1 ? "" : "s"}
                {pendingDiff.toAdd.length > 0 &&
                  ` (+${pendingDiff.toAdd.length})`}
                {pendingDiff.toRemove.length > 0 &&
                  ` (−${pendingDiff.toRemove.length})`}{" "}
                — click <b>Save</b> to persist.
              </span>
            ) : (
              <span className="text-emerald-700">All changes saved.</span>
            )}
          </p>
          <div className="flex gap-2">
            {step === "pick" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("review")}
                disabled={loading}
              >
                Review
                {excludedKeys.size > 0 ? ` (${excludedKeys.size})` : ""}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
            {step === "review" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("pick")}
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
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || saving || loading}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
