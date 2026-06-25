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
import {
  fieldMappingApi,
  fieldMappingKeys,
} from "@/lib/fieldMappingApi";
import type {
  SopFieldMapping,
  SopFieldMappingInput,
  SystemLabel,
} from "@/interfaces/fieldMapping";

const EMPTY_FORM: SopFieldMappingInput = {
  sop_field: "",
  description: "",
  category: "",
  systems: {},
  notes: "",
  is_active: true,
};

const linesToList = (text: string): string[] =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const listToLines = (list: string[] | undefined): string =>
  (list ?? []).join("\n");

export default function FieldMappingPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SopFieldMapping | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SopFieldMappingInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: meta } = useQuery({
    queryKey: fieldMappingKeys.meta(),
    queryFn: fieldMappingApi.meta,
    staleTime: 5 * 60 * 1000,
  });
  const systems: SystemLabel[] = meta?.systems ?? [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: fieldMappingKeys.list(),
    queryFn: fieldMappingApi.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: fieldMappingKeys.all });

  const saveMutation = useMutation({
    mutationFn: (payload: SopFieldMappingInput) =>
      editing
        ? fieldMappingApi.update(editing.id, payload)
        : fieldMappingApi.create(payload),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e: unknown) =>
      setFormError(e instanceof Error ? e.message : "Failed to save."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fieldMappingApi.remove(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: SopFieldMapping) => {
    setEditing(row);
    setForm({
      sop_field: row.sop_field,
      description: row.description,
      category: row.category,
      systems: row.systems ?? {},
      notes: row.notes,
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
    if (!form.sop_field.trim()) {
      setFormError("Business field name is required.");
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
        r.sop_field.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        Object.values(r.systems ?? {})
          .flat()
          .some((k) => k.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, SopFieldMapping[]>();
    for (const r of filtered) {
      const cat = r.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const systemLabel = (key: string) =>
    systems.find((s) => s.key === key)?.label ?? key;

  return (
    <SidebarLayout
      title="Field Mapping"
      subtitle="How business concepts map to raw source-system fields the audit engine reads"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Each row defines a business concept (e.g.{" "}
            <span className="font-medium text-foreground">Provider NPI</span>) and
            the exact source-system keys the engine should read for it. The engine
            checks systems in priority order (FACETS first, then the claim image),
            so an entry under the right system tells the audit how to interpret a
            claim. Edits apply to new claim runs immediately.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xs w-full">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search fields, keys, descriptions..."
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
            error="Failed to load field mappings."
            refetch={() => refetch()}
          />
        )}

        {isLoading && !data ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No field mappings found.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([category, items]) => (
              <section key={category} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
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
                            {row.sop_field}
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
                          {Object.entries(row.systems ?? {})
                            .filter(([, keys]) => (keys ?? []).length > 0)
                            .map(([sys, keys]) => (
                              <span
                                key={sys}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px]"
                                title={systemLabel(sys)}
                              >
                                <span className="font-semibold text-foreground">
                                  {sys}
                                </span>
                                <span className="text-muted-foreground">
                                  {keys.join(", ")}
                                </span>
                              </span>
                            ))}
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
                                  `Delete mapping for "${row.sop_field}"?`,
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit "${editing.sop_field}"` : "New field mapping"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Business field name
                  </span>
                  <Input
                    value={form.sop_field}
                    onChange={(e) =>
                      setForm({ ...form, sop_field: e.target.value })
                    }
                    placeholder="e.g. Provider NPI"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Category
                  </span>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="e.g. Provider"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">
                  Business description
                </span>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  placeholder="What this field means in business terms, so an auditor understands the source keys below."
                />
              </label>

              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Source-system keys
                </p>
                <p className="text-[11px] text-muted-foreground">
                  One key per line. The engine reads systems top-to-bottom and
                  uses the first match.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {systems.map((s) => (
                    <label key={s.key} className="space-y-1 block">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {s.label}
                      </span>
                      <Textarea
                        value={listToLines(form.systems?.[s.key])}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            systems: {
                              ...form.systems,
                              [s.key]: linesToList(e.target.value),
                            },
                          })
                        }
                        rows={3}
                        className="font-mono text-xs"
                        placeholder="(none)"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-foreground">Notes</span>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
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
