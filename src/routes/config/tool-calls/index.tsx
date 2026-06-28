import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Info,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import SearchInput from "@/components/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toolCallApi, toolCallKeys } from "@/lib/mcpConfigApi";
import type { ToolCall, ToolCallInput } from "@/interfaces/mcpConfig";
import type { ToolRegistryEntry } from "@/interfaces/workflows";
import ToolInvokeModal from "@/routes/workflows/components/ToolInvokeModal";
import ToolContextSummary, {
  toolContextKey,
} from "@/components/ToolContextSummary";

interface FormState {
  name: string;
  display_name: string;
  description: string;
  kind: string;
  mcp_path: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  display_name: "",
  description: "",
  kind: "api_agent",
  mcp_path: "",
  is_active: true,
};

const mcpPathOf = (t: ToolCall): string =>
  typeof t.metadata?.mcp_path === "string" ? (t.metadata.mcp_path as string) : "";

const PAGE_SIZE = 8;

export default function ToolCallsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ToolCall | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [testing, setTesting] = useState<ToolCall | null>(null);

  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search box so each keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any new search resets back to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: toolCallKeys.page({ page, search: debouncedSearch }),
    queryFn: () => toolCallApi.listPage({ page, search: debouncedSearch }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: toolCallKeys.all });

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; body: ToolCallInput; isEdit: boolean }) =>
      payload.isEdit
        ? toolCallApi.update(payload.name, payload.body)
        : toolCallApi.create(payload.body),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e: unknown) =>
      setFormError(e instanceof Error ? e.message : "Failed to save."),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => toolCallApi.remove(name),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: ToolCall) => {
    setEditing(row);
    setForm({
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      kind: row.kind,
      mcp_path: mcpPathOf(row),
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
    if (!form.name.trim()) {
      setFormError("A tool name (slug) is required.");
      return;
    }
    const metadata: Record<string, unknown> = {
      ...(editing?.metadata ?? {}),
    };
    if (form.mcp_path.trim()) metadata.mcp_path = form.mcp_path.trim();
    else delete metadata.mcp_path;

    const body: ToolCallInput = {
      name: form.name.trim(),
      display_name: form.display_name.trim(),
      description: form.description.trim(),
      kind: form.kind,
      metadata,
      is_active: form.is_active,
    };
    saveMutation.mutate({ name: form.name.trim(), body, isEdit: !!editing });
  };

  const rows = data?.results ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = data?.total_pages ?? 1;
  const safePage = data?.page ?? page;
  const hasPrev = data?.has_prev ?? safePage > 1;
  const hasNext = data?.has_next ?? safePage < pageCount;

  return (
    <SidebarLayout
      title="Tool Calls"
      subtitle="Registered tools the audit engine can call, with per-tool MCP paths"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Each tool stores only its{" "}
            <span className="font-medium text-foreground">path</span> (e.g.{" "}
            <span className="font-mono text-foreground">/tools/facets_get_summary</span>
            ). At runtime the engine joins it with the active{" "}
            <span className="font-medium text-foreground">MCP Server</span>'s base
            URL. Use <span className="font-medium text-foreground">Test</span> to
            invoke a tool with sample arguments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xs w-full">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search tools or paths..."
            />
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add tool call
            </Button>
          )}
        </div>

        {error && (
          <ErrorAlert error="Failed to load tool calls." refetch={() => refetch()} />
        )}

        {isLoading && !data ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {debouncedSearch
              ? "No tool calls match your search."
              : "No tool calls registered yet."}
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {rows.map((row) => {
              const path = mcpPathOf(row);
              return (
                <div
                  key={row.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {row.display_name || row.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wider"
                      >
                        {row.tool_kind || row.kind}
                      </Badge>
                      {!row.is_active && (
                        <span className="text-[10px] uppercase rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                          inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {row.name}
                    </p>
                    {row.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      mcp path:{" "}
                      {path ? (
                        <span className="font-mono text-foreground">{path}</span>
                      ) : (
                        <span className="italic">in-process (no MCP path)</span>
                      )}
                    </p>
                    <ToolContextSummary name={row.name} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTesting(row)}
                      className="gap-1"
                    >
                      <Play className="h-3.5 w-3.5" />
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
                            deleteMutation.variables === row.name
                          }
                          onClick={() => {
                            if (window.confirm(`Delete tool "${row.name}"?`))
                              deleteMutation.mutate(row.name);
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

        {!isLoading && pageCount > 1 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min((safePage - 1) * PAGE_SIZE + rows.length, totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{totalCount}</span>{" "}
              tools
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {safePage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!hasNext}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={showForm} onOpenChange={(o) => (o ? null : closeForm())}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit "${editing.name}"` : "New tool call"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Name (slug)
                  </span>
                  <Input
                    value={form.name}
                    disabled={!!editing}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "_"),
                      })
                    }
                    placeholder="facets_get_summary"
                    className="font-mono text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">Kind</span>
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="api_agent">Runtime API agent</option>
                    <option value="langchain">LangChain tool</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">
                  Display name
                </span>
                <Input
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  placeholder="FACETS — Get Summary"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">
                  Description
                </span>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">
                  MCP path
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Joined with the active MCP server's base URL. Leave blank to use
                  the in-process implementation.
                </p>
                <Input
                  value={form.mcp_path}
                  onChange={(e) => setForm({ ...form, mcp_path: e.target.value })}
                  placeholder="/tools/facets_get_summary"
                  className="font-mono text-xs"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <span className="text-foreground">Active</span>
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

        <ToolInvokeModal
          open={!!testing}
          onOpenChange={(o) => {
            if (!o && testing) {
              // The modal may have refreshed/created the tool's context;
              // re-fetch so the card summary reflects the latest analysis.
              queryClient.invalidateQueries({
                queryKey: toolContextKey(testing.name),
              });
              setTesting(null);
            }
          }}
          tool={testing ? (testing as unknown as ToolRegistryEntry) : null}
          initialArgs={
            testing && mcpPathOf(testing) ? { claim_number: "" } : undefined
          }
        />
      </div>
    </SidebarLayout>
  );
}
