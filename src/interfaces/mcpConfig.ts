/**
 * Types for the DB-backed MCP server + tool-call config screens
 * (Django ``/api/agent-tools/*``).
 *
 * The base endpoint + auth for an external claims MCP/REST server live once in
 * an {@link McpServerConfig}; each {@link ToolCall} stores only its per-tool
 * path in ``metadata.mcp_path``. The execution engine joins ``base_url + path``
 * at call time.
 */

/** Connection config for one external claims MCP/REST server. */
export interface McpServerConfig {
  id: string;
  label: string;
  /** Base endpoint, no trailing slash, e.g. https://claims-mock-mcp.toystack.dev */
  base_url: string;
  /** Header the server expects the API key under (mock uses ``x-api-key``). */
  auth_header: string;
  /** Never returned by the API — only whether a key is stored. */
  api_key_set: boolean;
  http_method: string;
  claim_arg: string;
  timeout_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface McpServerConfigInput {
  label: string;
  base_url: string;
  auth_header: string;
  /** Write-only. Omit/blank on update to keep the stored secret. */
  api_key?: string;
  http_method: string;
  claim_arg: string;
  timeout_seconds: number;
  is_active: boolean;
}

export interface McpServerTestResult {
  /** Overall healthy: the probed tool route exists (or base ping was 2xx). */
  ok: boolean;
  /** ``true`` when any HTTP response came back (host is up). */
  reachable?: boolean;
  /** For a tool-route probe: ``true`` when the route exists (status !== 404). */
  route_ok?: boolean | null;
  status_code: number | null;
  latency_ms: number;
  url: string;
  /** Name of the tool whose mcp_path was probed (null = bare base-URL ping). */
  probed_tool?: string | null;
  sample_claim?: string;
  note?: string;
  error?: string;
}

/** A single tool call the engine can route to the active MCP server. */
export interface ToolCall {
  id: string;
  name: string;
  display_name: string;
  description: string;
  kind: string;
  tool_kind?: string;
  invoke_url: string;
  args_schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  endpoint_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** List envelope from ``GET /api/agent-tools/mcp-servers/``. */
export interface McpServerListResponse {
  runtime_config_source: string;
  servers: McpServerConfig[];
}

export interface ToolCallInput {
  name: string;
  display_name?: string;
  description?: string;
  kind: string;
  invoke_url?: string;
  args_schema?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

/** Server-side paginated tool-call list envelope. */
export interface ToolCallPage {
  results: ToolCall[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ToolCallListParams {
  page: number;
  pageSize?: number;
  search?: string;
  all?: boolean;
}
