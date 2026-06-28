import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Info,
  Plug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { mcpServerApi, mcpServerKeys } from "@/lib/mcpConfigApi";
import type {
  McpServerConfig,
  McpServerConfigInput,
  McpServerTestResult,
} from "@/interfaces/mcpConfig";

const EMPTY_FORM: McpServerConfigInput = {
  label: "claims-mcp",
  base_url: "",
  auth_header: "x-api-key",
  api_key: "",
  http_method: "POST",
  claim_arg: "claim_number",
  timeout_seconds: 30,
  is_active: true,
};

export default function McpServersPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<McpServerConfigInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, McpServerTestResult>
  >({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: mcpServerKeys.list(),
    queryFn: mcpServerApi.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: mcpServerKeys.all });

  const saveMutation = useMutation({
    mutationFn: (payload: McpServerConfigInput) =>
      editing ? mcpServerApi.update(editing.id, payload) : mcpServerApi.create(payload),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e: unknown) =>
      setFormError(e instanceof Error ? e.message : "Failed to save."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mcpServerApi.remove(id),
    onSuccess: invalidate,
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => mcpServerApi.test(id),
    onSuccess: (res, id) => setTestResult((p) => ({ ...p, [id]: res })),
    onError: (e: unknown, id) =>
      setTestResult((p) => ({
        ...p,
        [id]: {
          ok: false,
          status_code: null,
          latency_ms: 0,
          url: "",
          error: e instanceof Error ? e.message : "Test failed",
        },
      })),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: McpServerConfig) => {
    setEditing(row);
    setForm({
      label: row.label,
      base_url: row.base_url,
      auth_header: row.auth_header,
      api_key: "",
      http_method: row.http_method,
      claim_arg: row.claim_arg,
      timeout_seconds: row.timeout_seconds,
      is_active: row.is_active,
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const submit = () => {
    setFormError(null);
    if (!form.label.trim() || !form.base_url.trim()) {
      setFormError("Label and base URL are required.");
      return;
    }
    // On edit, drop a blank api_key so the stored secret is preserved.
    const payload: McpServerConfigInput = { ...form };
    if (editing && !payload.api_key) delete payload.api_key;
    saveMutation.mutate(payload);
  };

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.base_url.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <SidebarLayout
      title="MCP Servers"
      subtitle="External claims MCP/REST endpoints the audit engine routes tool calls to"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            The base endpoint + auth for the claims data server live here (not
            hardcoded). The engine uses the most recently updated{" "}
            <span className="font-medium text-foreground">active</span> server
            and joins it with each tool's path. Edits take effect on the next
            tool call — no redeploy. Use{" "}
            <span className="font-medium text-foreground">Test</span> to confirm
            reachability.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xs w-full">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by label or URL..."
            />
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add server
            </Button>
          )}
        </div>

        {error && (
          <ErrorAlert error="Failed to load MCP servers." refetch={() => refetch()} />
        )}

        {isLoading && !data ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No MCP servers configured yet.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {filtered.map((row) => {
              const result = testResult[row.id];
              return (
                <div
                  key={row.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{row.label}</p>
                      {row.is_active ? (
                        <span className="text-[10px] uppercase rounded bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5">
                          active
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                          inactive
                        </span>
                      )}
                      {!row.api_key_set && (
                        <span className="text-[10px] uppercase rounded bg-amber-500/15 text-amber-600 px-1.5 py-0.5">
                          no key
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">
                      {row.http_method} {row.base_url}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      auth: {row.auth_header} · claim arg: {row.claim_arg} ·
                      timeout: {row.timeout_seconds}s
                    </p>
                    {result && (
                      <div
                        className={`mt-2 flex items-start gap-1.5 text-xs ${
                          result.ok
                            ? "text-emerald-600"
                            : result.reachable
                              ? "text-amber-600"
                              : "text-destructive"
                        }`}
                      >
                        {result.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        ) : result.reachable ? (
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        )}
                        <span>
                          {result.ok
                            ? result.probed_tool
                              ? `Reachable — tool route "${result.probed_tool}" responded HTTP ${result.status_code} in ${result.latency_ms}ms`
                              : `Reachable — HTTP ${result.status_code} in ${result.latency_ms}ms`
                            : result.reachable
                              ? result.probed_tool
                                ? `Host is up but the probed route ("${result.probed_tool}") returned HTTP ${result.status_code} (not found). Check the tool's mcp_path.`
                                : `Host is up (HTTP ${result.status_code} in ${result.latency_ms}ms).${result.note ? ` ${result.note}` : ""}`
                              : `Unreachable — ${result.error ?? "network error"}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testMutation.mutate(row.id)}
                      className="gap-1"
                      disabled={
                        testMutation.isPending && testMutation.variables === row.id
                      }
                    >
                      {testMutation.isPending && testMutation.variables === row.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plug className="h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={
                            deleteMutation.isPending &&
                            deleteMutation.variables === row.id
                          }
                          onClick={() => {
                            if (window.confirm(`Delete MCP server "${row.label}"?`))
                              deleteMutation.mutate(row.id);
                          }}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={(o) => (o ? null : closeForm())}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit "${editing.label}"` : "New MCP server"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">Label</span>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. claims-mock-mcp"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">
                  Base URL
                </span>
                <Input
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="https://claims-mock-mcp.toystack.dev"
                  className="font-mono text-xs"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Auth header
                  </span>
                  <Input
                    value={form.auth_header}
                    onChange={(e) =>
                      setForm({ ...form, auth_header: e.target.value })
                    }
                    placeholder="x-api-key"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    API key{" "}
                    {editing && (
                      <span className="text-muted-foreground/70 normal-case font-normal">
                        (blank = keep current)
                      </span>
                    )}
                  </span>
                  <Input
                    type="password"
                    value={form.api_key ?? ""}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    placeholder={
                      editing && editing.api_key_set ? "••••••••" : "secret key"
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    HTTP method
                  </span>
                  <Input
                    value={form.http_method}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        http_method: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="POST"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Claim arg
                  </span>
                  <Input
                    value={form.claim_arg}
                    onChange={(e) =>
                      setForm({ ...form, claim_arg: e.target.value })
                    }
                    placeholder="claim_number"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Timeout (s)
                  </span>
                  <Input
                    type="number"
                    min={1}
                    value={form.timeout_seconds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        timeout_seconds: Number(e.target.value) || 30,
                      })
                    }
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <span className="text-foreground">
                  Active (engine uses the latest active server)
                </span>
              </label>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={closeForm}>
                  Cancel
                </Button>
                <Button size="sm" loading={saveMutation.isPending} onClick={submit}>
                  {editing ? "Save changes" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
