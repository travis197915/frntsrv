import { useState, useEffect } from "react";
import { sopExclusionsApi } from "@/lib/api";
import type { DomTreeResponse, SopSourceHtmlResponse } from "@/interfaces/sop";
import type { SopHtmlState } from "./types";
import { domTreeToHtml } from "./domTreeUtils";

const INITIAL_STATE: SopHtmlState = {
  html: "",
  loading: false,
  err: null,
  isFallback: false,
  source: "",
  sourceUrl: "",
};

/**
 * Fetches the source HTML for a given SOP id.
 *
 * Strategy:
 *   1. Try `source-html` first — returns the sanitised live source document.
 *   2. If `available=false`, fall back to `dom-tree?source=live` which
 *      uses Neo4j → live URL → synthesised-from-audit-tables in that order,
 *      so it almost always has content.
 */
export function useSopHtml(activeSopId: number | null) {
  const [sopHtml, setSopHtml] = useState<SopHtmlState>(INITIAL_STATE);
  const [sopDomTree, setSopDomTree] = useState<DomTreeResponse | null>(null);

  useEffect(() => {
    if (activeSopId === null) {
      setSopHtml(INITIAL_STATE);
      return;
    }
    let cancelled = false;
    setSopHtml((prev) => ({ ...prev, loading: true, err: null, html: "", source: "" }));

    sopExclusionsApi
      .getSourceHtml(activeSopId)
      .then(async (d: SopSourceHtmlResponse) => {
        if (cancelled) return;
        if (d.available && d.html) {
          setSopDomTree(null);
          setSopHtml({
            html: d.html,
            loading: false,
            err: null,
            isFallback: d.is_fallback ?? false,
            source: "source-html",
            sourceUrl: d.source_url || "",
          });
          return;
        }
        // source-html unavailable — try the dom-tree endpoint which is more
        // reliable (Neo4j → live → synthesised fallback chain).
        try {
          const tree: DomTreeResponse = await sopExclusionsApi.getDomTree(activeSopId, "live");
          if (cancelled) return;
          const html = domTreeToHtml(tree.roots);
          if (html) {
            console.log(
              "[FSP domTree] stored",
              tree.source,
              "roots:",
              tree.roots.length,
              tree.roots.map((r) => ({
                section_id: r.section_id,
                block_id: r.block_id,
                childCount: r.children?.length,
              })),
            );
            setSopDomTree(tree);
            setSopHtml({
              html,
              loading: false,
              err: null,
              isFallback: tree.source !== "neo4j" && tree.source !== "live_html",
              source: tree.source,
              sourceUrl: "",
            });
          } else {
            setSopHtml({
              html: "",
              loading: false,
              err: d.reason || "No HTML content available for this SOP.",
              isFallback: false,
              source: "",
              sourceUrl: d.source_url || "",
            });
          }
        } catch (treeErr) {
          if (!cancelled) {
            setSopHtml({
              html: "",
              loading: false,
              err: d.reason || String((treeErr as Error)?.message ?? treeErr),
              isFallback: false,
              source: "",
              sourceUrl: d.source_url || "",
            });
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setSopHtml({
            ...INITIAL_STATE,
            err: String((e as Error)?.message ?? e),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSopId]);

  return { sopHtml, sopDomTree };
}
