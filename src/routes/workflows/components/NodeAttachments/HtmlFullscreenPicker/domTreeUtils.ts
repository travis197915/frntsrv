import type { DomTreeNode } from "@/interfaces/sop";

/**
 * Walks the tree in document order and collects each block's `html_snippet`,
 * deduplicating by block_id. Produces a single HTML string safe to mount
 * via dangerouslySetInnerHTML.
 *
 * Each snippet gets a `data-fsp-bid` attribute injected on its root element so
 * that highlight resolution can use a cheap querySelector lookup instead of
 * recomputing SHA-1 hashes of every DOM node.
 */
function injectBid(html: string, bid: string): string {
  // Match the very first opening tag (e.g. "<p", "<h2", "<table") and insert
  // the attribute before the first space-or->. Handles self-closing tags too.
  return html.replace(/^(<\s*[a-zA-Z][a-zA-Z0-9]*)(\s|\/?>)/, `$1 data-fsp-bid="${bid}"$2`);
}

export function domTreeToHtml(roots: DomTreeNode[]): string {
  const seen = new Set<string>();
  const ordered: { order: number; html: string }[] = [];

  function walk(nodes: DomTreeNode[]) {
    for (const node of nodes) {
      if (node.html_snippet && node.block_id && !seen.has(node.block_id)) {
        seen.add(node.block_id);
        ordered.push({
          order: node.order ?? 0,
          html: injectBid(node.html_snippet, node.block_id),
        });
      }
      if (node.children?.length) walk(node.children);
    }
  }

  walk(roots);
  ordered.sort((a, b) => a.order - b.order);
  return ordered.map((x) => x.html).join("\n");
}
