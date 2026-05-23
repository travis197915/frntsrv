/**
 * Two REST clients live here.
 *
 *   • `authApi`    → `claims-corebackend` (Node + Prisma) at VITE_AUTH_API_BASE_URL.
 *                    Identity only: /auth/register, /auth/login, /auth/me,
 *                    /auth/change-password.
 *
 *   • `api`        → the Django **builder** app at VITE_BUILDER_API_BASE_URL.
 *                    Workflows, the shape catalog, server-driven sidebar,
 *                    dashboard widgets — i.e. every aspect of the UI that
 *                    comes from the backend.
 *
 * Both clients:
 *   - Attach `Authorization: Bearer <jwt>` from localStorage when present.
 *   - Parse JSON, throw `ApiError` on non-2xx, bounce to /login on 401.
 *
 * Both consume the **same** JWT — the Django service trusts whatever the
 * Node corebackend mints via a shared `JWT_SECRET`.
 */

import { clearAuth, getToken } from '@/utils/auth';

const rstrip = (s: string) => s.replace(/\/+$/, '');

const AUTH_BASE_URL: string = rstrip(
  import.meta.env.VITE_AUTH_API_BASE_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4000',
);

const BUILDER_BASE_URL: string = rstrip(
  import.meta.env.VITE_BUILDER_API_BASE_URL ??
  'http://localhost:8000/api/builder',
);

/** Origin of the Django server (no path), used for building absolute URLs
 *  to non-builder Django views (e.g. the SOP viewer page). */
export const DJANGO_ORIGIN: string = (() => {
  try {
    return new URL(BUILDER_BASE_URL).origin;
  } catch {
    return 'http://localhost:8000';
  }
})();

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function makeClient(baseUrl: string) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });

    let payload: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (res.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }

    if (!res.ok) {
      const message =
        payload && typeof payload === 'object' &&
        ('error' in (payload as Record<string, unknown>) ||
         'detail' in (payload as Record<string, unknown>))
          ? String(
              (payload as Record<string, unknown>).error ??
              (payload as Record<string, unknown>).detail,
            )
          : `Request failed: ${res.status}`;
      throw new ApiError(res.status, message, payload);
    }

    return payload as T;
  }

  return {
    baseUrl,
    get:    <T = unknown>(path: string,                init?: RequestInit) => request<T>('GET',    path, undefined, init),
    post:   <T = unknown>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST',   path, body, init),
    put:    <T = unknown>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT',    path, body, init),
    patch:  <T = unknown>(path: string, body?: unknown, init?: RequestInit) => request<T>('PATCH',  path, body, init),
    delete: <T = unknown>(path: string,                init?: RequestInit) => request<T>('DELETE', path, undefined, init),
  };
}

/** Identity service — Node `claims-corebackend`. */
export const authApi = makeClient(AUTH_BASE_URL);

/** Builder service — Django `sop_backend/builder` app. */
export const api = makeClient(BUILDER_BASE_URL);

/** SOP ingestion service — Django `sop_backend/sop_ingestion` app.
 *  Lives at /api/ingest/ on the same Django origin as the builder. */
export const ingestApi = makeClient(`${DJANGO_ORIGIN}/api/ingest`);

// ── SOP graph types ────────────────────────────────────────────────────────

export type SopGraphNodeType =
  | 'DOCUMENT' | 'META' | 'PRE_SECTION' | 'PRE_RULE'
  | 'STEP' | 'DECISION' | 'ANNOTATION' | 'CODE'
  | 'GROUP_LIMIT' | 'DATE_COND' | 'REFERENCE' | string;

export interface SopGraphNode {
  id: string;          // node_key
  label: string;
  type: SopGraphNodeType;
  details: Record<string, unknown>;
  ref_table: string;
  ref_id: number | null;
  display_order: number;
}

export interface SopGraphEdge {
  id: string;
  source: string;
  target: string;
  rel: string;
  label: string;
  details: Record<string, unknown>;
}

export interface SopGraphResponse {
  sop_id: number | null;
  seed_url: string;
  status: string;
  nodes: SopGraphNode[];
  edges: SopGraphEdge[];
}

// ── SOP sections (tabular view) ────────────────────────────────────────────

export interface SopRule {
  condition?: string;
  action?: string;
  section?: string;
  is_exception?: boolean;
  decision_type?: string;
  [key: string]: unknown;
}

export interface SopPrecondition {
  id: number;
  order: number;
  category: string;
  label: string;
  content_text: string;
  is_blocking: boolean;
  rules: SopRule[];
}

export interface SopDecision {
  row_index: number;
  condition_if: string;
  condition_and: string;
  action_text: string;
  action_summary: string;
  decision_type: string;
  goto_step: number | null;
  is_final: boolean;
  eob_codes: string[];
  ex_codes: string[];
  denial_codes: string[];
  system_actions: string[];
  all_codes: string[];
}

export interface SopStep {
  step_number: number;
  question: string;
  intro_text: string;
  is_terminal: boolean;
  terminal_action: string;
  is_sub_procedure: boolean;
  sub_procedure: string;
  decisions: SopDecision[];
}

export interface SopCode {
  value: string;
  type: string;
  description: string;
  context: string;
  source_step: number | null;
}

export interface SopGroupLimit {
  group_name: string;
  inn_days: number | null;
  oon_days: number | null;
  limit_days: number | null;
  basis: string;
  network_type: string;
  exceptions: string[];
  special_notes: string[];
}

export interface SopAnnotation {
  type: string;
  content_text: string;
  is_claim_impact: boolean;
  step_number: number | null;
}

export interface SopReference {
  ref_text: string;
  ref_url: string;
  ref_type: string;
  is_resolved: boolean;
  step_number: number | null;
}

export interface SopSectionsResponse {
  sop_id: number | null;
  seed_url: string;
  status: string;
  title: string;
  purpose: string;
  summary: string;
  platform: string;
  lob: string[];
  preconditions: SopPrecondition[];
  steps: SopStep[];
  codes: SopCode[];
  group_limits: SopGroupLimit[];
  annotations: SopAnnotation[];
  references: SopReference[];
}

// ── SOP user-curated exclusions ─────────────────────────────────────────────

/** Target kinds an auditor can mark as excluded. Keys match the stable keys
 *  emitted by `/api/builder/workflows/<id>/attachable/`. */
export type SopExclusionTargetKind =
  | 'rule'        // "pre:<sop>:<pc>:<idx>" or "step:<sop>:<step>:<row>"
  | 'step'        // "step:<sop>:<step_no>"        — fan-out to all rows
  | 'section'     // "pre:<sop>:<precondition_id>" — fan-out to all rules
  | 'sop'         // "sop:<sop>"
  | 'graph_node'  // raw AuditGraphNode.node_key
  | 'html_block'; // "html:<sop>:html-<sha>" — raw HTML section

export interface SopExclusion {
  id: number;
  sop_id: number;
  target_kind: SopExclusionTargetKind;
  target_key:  string;
  label:       string;
  reason:      string;
  snippet_text: string;
  metadata:    Record<string, unknown>;
  created_by_id:    string;
  created_by_email: string;
  created_at:  string | null;
  updated_at:  string | null;
}

export interface SopExclusionListResponse {
  sop_id: number;
  count:  number;
  results: SopExclusion[];
}

export interface SopExclusionToggleResponse {
  sop_id: number;
  target_kind: SopExclusionTargetKind;
  target_key:  string;
  excluded:    boolean;
  exclusion?:  SopExclusion;
}

export interface SopExclusionUpsertInput {
  target_kind: SopExclusionTargetKind;
  target_key:  string;
  label?:      string;
  reason?:     string;
  snippet_text?: string;
  metadata?:   Record<string, unknown>;
}

// ── SOP HTML section blocks (selectable raw-HTML chunks) ────────────────────

export interface SopHtmlBlock {
  block_id:     string;                    // "html-abc123…"
  kind:         'heading' | 'table' | 'list' | 'paragraph' | 'callout' | 'code' | 'metadata' | string;
  tag:          string;                    // "h2" | "table" | …
  label:        string;
  html:         string;                    // pre-rendered HTML fragment
  text:         string;
  depth:        number;
  order:        number;
  target_kind:  'html_block';
  target_key:   string;                    // "html:<sop>:<block_id>"
  is_excluded:  boolean;
  exclusion_id: number | null;
}

export interface SopHtmlBlocksResponse {
  sop_id:     number;
  source_url: string;
  doc_format: string;
  count:      number;
  blocks:     SopHtmlBlock[];
}

/** Sanitized source HTML for click-to-pick exclusion mode. */
export interface SopSourceHtmlResponse {
  sop_id:     number;
  doc_format: string;
  source_url: string;
  available:  boolean;
  html:       string;     // body innerHTML; safe to mount via dangerouslySetInnerHTML
  reason:     string;     // populated when available === false
  excluded_target_keys: string[];   // already-excluded html_block target_keys
}

/** Per-SOP exclusion client. Backed by `/api/ingest/sops/<sop_id>/exclusions/`.
 *  No LLM: rule keys are the same stable keys the rule picker already knows. */
export const sopExclusionsApi = {
  list(sopId: number): Promise<SopExclusionListResponse> {
    return ingestApi.get<SopExclusionListResponse>(`/sops/${sopId}/exclusions/`);
  },
  upsert(sopId: number, input: SopExclusionUpsertInput): Promise<SopExclusion> {
    return ingestApi.post<SopExclusion>(`/sops/${sopId}/exclusions/`, input);
  },
  toggle(
    sopId: number,
    input: SopExclusionUpsertInput & { on?: boolean },
  ): Promise<SopExclusionToggleResponse> {
    return ingestApi.post<SopExclusionToggleResponse>(
      `/sops/${sopId}/exclusions/toggle/`, input,
    );
  },
  remove(sopId: number, exclusionId: number): Promise<void> {
    return ingestApi.delete<void>(`/sops/${sopId}/exclusions/${exclusionId}/`);
  },
  /** Server-extracted HTML sections of the SOP (headings, tables, lists,
   *  paragraphs, callouts). Each block is content-hashed so the id is
   *  stable across re-fetches. */
  listHtmlBlocks(sopId: number): Promise<SopHtmlBlocksResponse> {
    return ingestApi.get<SopHtmlBlocksResponse>(`/sops/${sopId}/html-blocks/`);
  },
  /** Sanitized source HTML for click-to-pick exclusion mode (Available
   *  only for HTTP-served SOPs). */
  getSourceHtml(sopId: number): Promise<SopSourceHtmlResponse> {
    return ingestApi.get<SopSourceHtmlResponse>(`/sops/${sopId}/source-html/`);
  },
};

/** SHA-1(input).slice(0, 12) → matches Python ``block_id_for_html`` so the
 *  same HTML fragment maps to the same exclusion target_key on both sides. */
export async function htmlBlockId(html: string): Promise<string> {
  const bytes = new TextEncoder().encode(html ?? '');
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `html-${hex.slice(0, 12)}`;
}

// ── Identity types (Node corebackend) ───────────────────────────────────────

export interface CorebackendUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: CorebackendUser;
}

// ── Builder catalog types (Django) ──────────────────────────────────────────

export interface ShapePort {
  id: string;
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  kind: 'source' | 'target' | 'both';
}

export type PropertyType = 'string' | 'text' | 'number' | 'boolean' | 'select';

export interface ShapePropertyField {
  name: string;
  label: string;
  type: PropertyType;
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
}

export interface ShapeDefinition {
  id: string;
  slug: string;
  label: string;
  description: string;
  kind: string;
  svg_path: string;
  viewbox: string;
  default_label: string;
  default_width: number;
  default_height: number;
  default_style: Record<string, unknown>;
  ports: ShapePort[];
  property_schema: ShapePropertyField[];
  category_slug: string;
  order: number;
  is_active: boolean;
}

export interface ShapeCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  order: number;
  is_active: boolean;
  shapes: ShapeDefinition[];
}

export interface NavItem {
  id: string;
  slug: string;
  label: string;
  icon: string;
  href: string;
  section: string;
  min_role: 'MEMBER' | 'ADMIN';
  order: number;
}

export interface DashboardWidget {
  id: string;
  slug: string;
  label: string;
  icon: string;
  kind: 'stat' | 'chart' | 'list' | 'card';
  value: string;
  query: string;
  color_class: string;
  order: number;
}

// ── Builder workflow types (Django) ─────────────────────────────────────────

export interface BuilderSopStatus {
  job_id: string;
  seed_url: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | string;
  docs_processed: number;
  docs_failed: number;
  created_at: string;
  completed_at: string | null;
  audit_sop_id: number | null;
}

export interface BuilderAttachedAgent {
  name: string;
  url: string;
  method: string;
  auth_type: 'none' | 'bearer' | 'api_key' | 'basic' | string;
  description: string;
  endpoint_id: string;
}

export interface BuilderWorkflow {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  owner_id: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
  sops?: BuilderSopStatus[];
  attached_agents?: BuilderAttachedAgent[];
}

export interface BuilderShape {
  id: string;
  definition_slug: string;
  label: string;
  description: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
  properties: Record<string, unknown>;
  order: number;
}

export interface BuilderWorkbench {
  id: string;
  name: string;
  description: string;
  node_key: string;
  kind: string;
  config: Record<string, unknown>;
  order: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
  shapes: BuilderShape[];
}

export interface BuilderWorkArea {
  id: string;
  name: string;
  description: string;
  order: number;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  metadata: Record<string, unknown>;
  workbenches: BuilderWorkbench[];
}

export interface BuilderConnection {
  id: string;
  source_shape: string;
  target_shape: string;
  source_port: string;
  target_port: string;
  label: string;
  condition_label: string;
  waypoints: unknown[];
  style: Record<string, unknown>;
}

export interface BuilderGraph extends BuilderWorkflow {
  work_areas: BuilderWorkArea[];
  connections: BuilderConnection[];
}
