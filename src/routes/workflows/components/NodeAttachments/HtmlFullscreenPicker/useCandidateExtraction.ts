import { useEffect, useMemo, useRef, useState } from "react";
import { htmlBlockId } from "@/lib/api";
import type { SopSourceHtmlResponse } from "@/interfaces/sop";

export interface CandidatePreview {
  bid: string;
  tag: string;
  tagIndex: number;
  label: string;
  snippet: string;
  target_key: string;
}

interface UseCandidateExtractionResult {
  candidates: CandidatePreview[];
  setCandidates: React.Dispatch<React.SetStateAction<CandidatePreview[]>>;
  hashesReady: number;
  snapshotRef: React.RefObject<WeakMap<HTMLElement, string>>;
  hashRef: React.RefObject<WeakMap<HTMLElement, string>>;
  candidateMetaRef: React.RefObject<
    Map<string, { tag: string; tagIndex: number }>
  >;
  elementByBidRef: React.RefObject<Map<string, HTMLElement>>;
  resolveByBid: (bid: string) => HTMLElement | null;
}

export function useCandidateExtraction(
  containerRef: React.RefObject<HTMLDivElement | null>,
  data: SopSourceHtmlResponse | null,
  sopId: number,
): UseCandidateExtractionResult {
  const [candidates, setCandidates] = useState<CandidatePreview[]>([]);
  const [hashesReady, setHashesReady] = useState(0);

  // Snapshot of each candidate's ORIGINAL outerHTML — hashing always reads
  // from here so live DOM mutations (adding .excl-marked) don't shift the hash.
  const snapshotRef = useRef<WeakMap<HTMLElement, string>>(new WeakMap());
  const hashRef = useRef<WeakMap<HTMLElement, string>>(new WeakMap());
  const hashedListRef = useRef<HTMLElement[]>([]);
  // bid → (tag, tagIndex): stable across React re-renders because it never
  // relies on attributes that React might wipe.
  const candidateMetaRef = useRef<
    Map<string, { tag: string; tagIndex: number }>
  >(new Map());
  const elementByBidRef = useRef<Map<string, HTMLElement>>(new Map());

  // Block-level tags we'll list in the sidebar checkbox column.
  const SIDEBAR_TAGS = useMemo(
    () =>
      new Set([
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "P",
        "TABLE",
        "TR",
        "UL",
        "OL",
        "LI",
        "BLOCKQUOTE",
        "PRE",
        "FIGURE",
        "DT",
        "DD",
      ]),
    [],
  );

  // Snapshot + async hash every candidate element once per SOP + data change.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !data?.available) return;
    let cancelled = false;

    const els = Array.from(
      root.querySelectorAll<HTMLElement>(
        Array.from(SIDEBAR_TAGS)
          .map((t) => t.toLowerCase())
          .join(", "),
      ),
    ).slice(0, 6000);

    const snap = new WeakMap<HTMLElement, string>();
    for (const el of els) snap.set(el, el.outerHTML);
    snapshotRef.current = snap;

    (async () => {
      const hashes = new WeakMap<HTMLElement, string>();
      const byBid = new Map<string, HTMLElement>();
      const tagCounts = new Map<string, number>();
      const previews: CandidatePreview[] = [];
      const CHUNK = 200;
      for (let i = 0; i < els.length; i += CHUNK) {
        if (cancelled) return;
        const chunk = els.slice(i, i + CHUNK);
        const results = await Promise.all(
          chunk.map((el) => htmlBlockId(snap.get(el) || el.outerHTML)),
        );
        results.forEach((h, j) => {
          const el = chunk[j];
          const tag = el.tagName.toLowerCase();
          const tagIndex = tagCounts.get(tag) ?? 0;
          tagCounts.set(tag, tagIndex + 1);
          hashes.set(el, h);
          if (!byBid.has(h)) {
            byBid.set(h, el);
            const text = (el.textContent || "").trim();
            const label = (text || tag).slice(0, 200);
            previews.push({
              bid: h,
              tag,
              tagIndex,
              label,
              snippet: text.slice(0, 240),
              target_key: `html:${sopId}:${h}`,
            });
          }
        });
      }
      if (cancelled) return;
      hashRef.current = hashes;
      hashedListRef.current = els;
      elementByBidRef.current = byBid;
      const meta = new Map<string, { tag: string; tagIndex: number }>();
      for (const p of previews)
        meta.set(p.bid, { tag: p.tag, tagIndex: p.tagIndex });
      candidateMetaRef.current = meta;
      setCandidates(previews);
      setHashesReady((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [data, sopId, SIDEBAR_TAGS, containerRef]);

  /** Live lookup: uses (tag, tagIndex) from candidateMetaRef to find the live
   *  DOM element. Survives any React re-render of the dangerouslySetInnerHTML
   *  subtree because it never relies on attributes React might wipe. */
  const resolveByBid = (bid: string): HTMLElement | null => {
    const meta = candidateMetaRef.current.get(bid);
    const root = containerRef.current;
    if (root && meta) {
      const all = root.getElementsByTagName(meta.tag);
      const el = all.item(meta.tagIndex) as HTMLElement | null;
      if (el) return el;
    }
    return elementByBidRef.current.get(bid) ?? null;
  };

  return {
    candidates,
    setCandidates,
    hashesReady,
    snapshotRef,
    hashRef,
    candidateMetaRef,
    elementByBidRef,
    resolveByBid,
  };
}
