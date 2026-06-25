import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Info } from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SearchInput from "@/components/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ontologyApi, ontologyKeys } from "@/lib/fieldMappingApi";
import type {
  ClaimOntologyField,
  ClaimOntologyFieldInput,
} from "@/interfaces/fieldMapping";

const EMPTY_FORM: ClaimOntologyFieldInput = {
  namespace: "",
  canonical_field: "",
  description: "",
  aliases: [],
  is_active: true,
};

const linesToList = (text: string): string[] =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export default function ClaimOntologyPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClaimOntologyField | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClaimOntologyFieldInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ontologyKeys.list(),
    queryFn: ontologyApi.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ontologyKeys.all });

  const saveMutation = useMutation({
    mutationFn: (payload: ClaimOntologyFieldInput) =>
      editing
        ? ontologyApi.update(editing.id, payload)
        : ontologyApi.create(payload),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e: unknown) =>
      setFormError(e instanceof Error ? e.message : "Failed to save."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ontologyApi.remove(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: ClaimOntologyField) => {
    setEditing(row);
    setForm({
      namespace: row.namespace,
      canonical_field: row.canonical_field,
      description: row.description,
      aliases: row.aliases ?? [],
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
    if (!form.namespace.trim() || !form.canonical_field.trim()) {
      setFormError("Namespace and canonical field are required.");
      return;
    }
    saveMutation.mutate(form);
  };

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.canonical_field.toLowerCase().includes(q) ||
        r.namespace.toLowerCase().includes(q) ||
        (r.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ClaimOntologyField[]>();
    for (const r of filtered) {
      const ns = r.namespace || "other";
      if (!map.has(ns)) map.set(ns, []);
      map.get(ns)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <SidebarLayout
      title="Claim Ontology"
      subtitle="CMS-1500 canonical fields and the raw labels that normalise to them"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            The ontology teaches the claim parser that messy, real-world labels
            (e.g.{" "}
            <span className="font-medium text-foreground">"PATIENT NAME"</span>,{" "}
            <span className="font-medium text-foreground">"PAT NAME (LFM)"</span>)
            all mean the same canonical field. Group related fields by{" "}
            <span className="font-medium text-foreground">namespace</span> (the
            CMS-1500 section).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xs w-full">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search fields, aliases, namespaces..."
            />
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add field
            </Button>
          )}
        </div>

        {error && (
          <ErrorAlert
            error="Failed to load claim ontology."
            refetch={() => refetch()}
          />
        )}

        {isLoading && !data ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No ontology fields found.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([namespace, items]) => (
              <section key={namespace} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {namespace}{" "}
                  <span className="text-muted-foreground/60">
                    ({items.length})
                  </span>
                </h3>
                <div className="rounded-lg border border-border bg-card divide-y divide-border">
                  {items.map((row) => (
                    <div
                      key={row.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {row.canonical_field}
                          </p>
                          {!row.is_active && (
                            <span className="text-[10px] uppercase rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                              inactive
                            </span>
                          )}
                        </div>
                        {row.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {row.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(row.aliases ?? []).map((a, i) => (
                            <span
                              key={`${row.id}-${i}`}
                              className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {a}
                            </span>
                          ))}
                          {(row.aliases ?? []).length === 0 && (
                            <span className="text-[11px] text-muted-foreground/60">
                              no aliases
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
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
                              if (
                                window.confirm(
                                  `Delete ontology field "${row.canonical_field}"?`,
                                )
                              )
                                deleteMutation.mutate(row.id);
                            }}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={(o) => (o ? null : closeForm())}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? `Edit "${editing.canonical_field}"`
                  : "New ontology field"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Namespace
                  </span>
                  <Input
                    value={form.namespace}
                    onChange={(e) =>
                      setForm({ ...form, namespace: e.target.value })
                    }
                    placeholder="e.g. person_blocks"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Canonical field
                  </span>
                  <Input
                    value={form.canonical_field}
                    onChange={(e) =>
                      setForm({ ...form, canonical_field: e.target.value })
                    }
                    placeholder="e.g. 2 PATIENTS NAME (LFM)"
                  />
                </label>
              </div>

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
                  Aliases
                </span>
                <p className="text-[11px] text-muted-foreground">
                  One raw label per line. Any of these normalise to the canonical
                  field above.
                </p>
                <Textarea
                  value={(form.aliases ?? []).join("\n")}
                  onChange={(e) =>
                    setForm({ ...form, aliases: linesToList(e.target.value) })
                  }
                  rows={5}
                  className="font-mono text-xs"
                  placeholder={"PATIENT NAME\nPAT NAME (LFM)"}
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

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={closeForm}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  loading={saveMutation.isPending}
                  onClick={submit}
                >
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
