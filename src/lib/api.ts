/**
 * Public API surface — re-exports clients, types, and the SOP exclusion
 * helper so that consumer files keep importing from `@/lib/api` unchanged.
 */

// ── HTTP client factory + error class ───────────────────────────────────────
export { makeClient, ApiError } from "./apiClient";

// ── Named client instances (backward-compatible aliases) ────────────────────
export {
  relayClient as authApi,
  builderClient as api,
  ingestClient as ingestApi,
  toolsClient as toolsApi,
  usersClient as usersApi,
  apiClient,
} from "./clients";

const rstrip = (s: string) => s.replace(/\/+$/, "");
/** Points to the Node relay so all traffic stays within one origin. */
export const DJANGO_ORIGIN: string = rstrip(
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000",
);

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
  SopExclusion,
  SopExclusionListResponse,
  SopExclusionToggleResponse,
  SopExclusionUpsertInput,
  SopHtmlBlocksResponse,
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
