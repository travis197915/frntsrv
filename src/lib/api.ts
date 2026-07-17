/**
 * Public API surface — re-exports clients, types, and the SOP exclusion
 * helper so that consumer files keep importing from `@/lib/api` unchanged.
 */

// ── HTTP client factory + error class ───────────────────────────────────────
export { makeClient, ApiError, AUTH_BASE, API_BASE } from "./apiClient";

// ── Named client instances (backward-compatible aliases) ────────────────────
export { executionApi, formatExecutionLogLine } from "./executionApi";
export {
  relayClient as authApi,
  builderClient as api,
  ingestClient as ingestApi,
  toolsClient as toolsApi,
  executeClient,
  usersClient as usersApi,
  dashboardClient,
  apiClient,
} from "./clients";

/** @deprecated Prefer API_BASE — kept for older imports. */
export { API_BASE as DJANGO_ORIGIN } from "./apiClient";

// ── Domain types ────────────────────────────────────────────────────────────
export type * from "../interfaces/sop";
export type * from "../interfaces/builder";
export type * from "../interfaces/identity";
export type * from "../interfaces/workflows";

// ── Domain adapters ─────────────────────────────────────────────────────────
export { workflowsApi, toolRegistryApi } from "./workflowsApi";

// ── SOP exclusion API ───────────────────────────────────────────────────────
import { ingestClient } from "./clients";
import type {
  DomTreeResponse,
  SopExclusion,
  SopExclusionListResponse,
  SopExclusionToggleResponse,
  SopExclusionUpsertInput,
  SopHtmlBlocksResponse,
  SopReviewActionResponse,
  SopSourceHtmlResponse,
} from "../interfaces/sop";

export const sopExclusionsApi = {
  list(sopId: number): Promise<SopExclusionListResponse> {
    return ingestClient.get<SopExclusionListResponse>(
      `/sops/${sopId}/exclusions/`,
    );
  },
  upsert(
    sopId: number,
    input: SopExclusionUpsertInput,
  ): Promise<SopExclusion> {
    return ingestClient.post<SopExclusion>(
      `/sops/${sopId}/exclusions/`,
      input,
    );
  },
  toggle(
    sopId: number,
    input: SopExclusionUpsertInput & { on?: boolean },
  ): Promise<SopExclusionToggleResponse> {
    return ingestClient.post<SopExclusionToggleResponse>(
      `/sops/${sopId}/exclusions/toggle/`,
      input,
    );
  },
  remove(sopId: number, exclusionId: number): Promise<void> {
    return ingestClient.delete<void>(
      `/sops/${sopId}/exclusions/${exclusionId}/`,
    );
  },
  listHtmlBlocks(sopId: number): Promise<SopHtmlBlocksResponse> {
    return ingestClient.get<SopHtmlBlocksResponse>(
      `/sops/${sopId}/html-blocks/`,
    );
  },
  getSourceHtml(sopId: number): Promise<SopSourceHtmlResponse> {
    return ingestClient.get<SopSourceHtmlResponse>(
      `/sops/${sopId}/source-html/`,
    );
  },
  /**
   * Fetch the full DOM tree for a SOP.
   *
   * `source=live` builds the tree from Neo4j first, then falls back to
   * fetching the live source URL, then synthesises from audit-table rows —
   * so it always returns *something* even when `source-html` says unavailable.
   * `source=neo4j` is the default server-side, but uses `live` here so the
   * caller gets a result even for SOPs that haven't been (re-)ingested via
   * the html_dom_writer yet.
   */
  getDomTree(
    sopId: number,
    source: "neo4j" | "live" = "live",
  ): Promise<DomTreeResponse> {
    return ingestClient.get<DomTreeResponse>(
      `/sops/${sopId}/dom-tree/?source=${source}`,
    );
  },
};

export const sopReviewApi = {
  activate(sopId: number): Promise<SopReviewActionResponse> {
    return ingestClient.post<SopReviewActionResponse>(
      `/sops/${sopId}/activate/`,
      {},
    );
  },
  reject(sopId: number): Promise<SopReviewActionResponse> {
    return ingestClient.post<SopReviewActionResponse>(
      `/sops/${sopId}/reject/`,
      {},
    );
  },
};

/** SHA-1(input).slice(0, 12) — matches Python `block_id_for_html`. */
export async function htmlBlockId(html: string): Promise<string> {
  const bytes = new TextEncoder().encode(html ?? "");
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `html-${hex.slice(0, 12)}`;
}
