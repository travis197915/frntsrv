/**
 * API module for the DB-backed MCP server + tool-call config (Django
 * ``/api/agent-tools/*``). These replace hardcoded MCP server details: the
 * active server config + each tool's path become the runtime source of truth
 * the execution engine reads when routing a tool call.
 */
import { toolsClient } from "@/lib/clients";
import type {
  McpServerConfig,
  McpServerConfigInput,
  McpServerListResponse,
  McpServerTestResult,
  ToolCall,
  ToolCallInput,
  ToolCallListParams,
  ToolCallPage,
} from "@/interfaces/mcpConfig";
import type { ToolInvokeResponse } from "@/interfaces/workflows";

export const mcpServerKeys = {
  all: ["mcp-servers"] as const,
  list: () => ["mcp-servers", "list"] as const,
};

export const toolCallKeys = {
  all: ["tool-calls"] as const,
  list: () => ["tool-calls", "list"] as const,
  page: (params: ToolCallListParams) =>
    ["tool-calls", "page", params] as const,
};

function normalizeMcpServerList(
  data: McpServerConfig[] | McpServerListResponse | null | undefined,
): McpServerConfig[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.servers)) return data.servers;
  return [];
}

export const mcpServerApi = {
  list: async () => {
    const data = await toolsClient.get<McpServerListResponse>("/mcp-servers/");
    return normalizeMcpServerList(data);
  },
  create: (body: McpServerConfigInput) =>
    toolsClient.post<McpServerConfig>("/mcp-servers/", body),
  update: (id: string, body: Partial<McpServerConfigInput>) =>
    toolsClient.put<McpServerConfig>(`/mcp-servers/${id}/`, body),
  remove: (id: string) => toolsClient.delete(`/mcp-servers/${id}/`),
  /** Reachability check against the server's base URL (optionally a path). */
  test: (id: string, path?: string) =>
    toolsClient.post<McpServerTestResult>(`/mcp-servers/${id}/test/`, {
      path: path ?? "",
    }),
};

export const toolCallApi = {
  /** ``?all=1`` so the config screen can see + toggle inactive tools. */
  list: () => toolsClient.get<ToolCall[]>("/?all=1"),
  /** Server-side paginated + searched list for the config screen. */
  listPage: ({ page, pageSize = 8, search = "", all = true }: ToolCallListParams) => {
    const q = new URLSearchParams();
    if (all) q.set("all", "1");
    q.set("page", String(page));
    q.set("page_size", String(pageSize));
    if (search.trim()) q.set("search", search.trim());
    return toolsClient.get<ToolCallPage>(`/?${q.toString()}`);
  },
  create: (body: ToolCallInput) => toolsClient.post<ToolCall>("/", body),
  update: (name: string, body: Partial<ToolCallInput>) =>
    toolsClient.put<ToolCall>(`/${name}/`, body),
  remove: (name: string) => toolsClient.delete(`/${name}/`),
  invoke: (name: string, args: Record<string, unknown>) =>
    toolsClient.post<ToolInvokeResponse>(`/${name}/invoke`, { args }),
};
