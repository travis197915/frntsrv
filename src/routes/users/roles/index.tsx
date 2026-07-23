import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPanel, FormInput } from "@/components/FormPanel";
import { useAuth } from "@/contexts/AuthContext";
import { rolesClient, permissionsClient } from "@/lib/clients";
import { cn } from "@/utils/utils";
import type { AclPermission, AclRole } from "@/interfaces/acl";

/** These two seed roles are load-bearing (register() and the bootstrap
 * script both look them up by name) — block deletion client-side. */
const SYSTEM_ROLE_NAMES = new Set(["ADMIN", "AUDITOR"]);

const WILDCARD = "*";

function groupPermissions(
  permissions: AclPermission[],
): Array<{ group: string; items: AclPermission[] }> {
  const groups = new Map<string, AclPermission[]>();
  for (const p of permissions) {
    const group = p.key.split(":")[0];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(p);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

function RolePermissionEditor({
  role,
  catalog,
}: {
  role: AclRole;
  catalog: AclPermission[];
}) {
  const queryClient = useQueryClient();
  // The wildcard is tracked separately from individual keys — the backend
  // treats "*" as "matches any permission", so a role holding it effectively
  // grants every permission below regardless of which specific keys are also
  // stored. Keeping a shadow set of granular keys means turning full access
  // off restores whatever fine-grained selection was there before, instead
  // of wiping it.
  const [hasWildcard, setHasWildcard] = useState(
    () => role.permissions.includes(WILDCARD),
  );
  const [grantedKeys, setGrantedKeys] = useState<Set<string>>(
    () => new Set(role.permissions.filter((k) => k !== WILDCARD)),
  );

  const originalHasWildcard = role.permissions.includes(WILDCARD);
  const originalKeys = new Set(role.permissions.filter((k) => k !== WILDCARD));
  const dirty =
    hasWildcard !== originalHasWildcard ||
    grantedKeys.size !== originalKeys.size ||
    [...grantedKeys].some((k) => !originalKeys.has(k));

  const { mutateAsync: savePermissions, isPending: saving } = useMutation({
    mutationFn: (permissionKeys: string[]) =>
      rolesClient.post(`/${role.id}/permissions`, { permissionKeys }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const toggle = (key: string) => {
    setGrantedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const grouped = groupPermissions(catalog.filter((p) => p.key !== WILDCARD));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Permissions</h2>
        <Button
          size="sm"
          disabled={!dirty || saving}
          loading={saving}
          onClick={() =>
            savePermissions(
              hasWildcard ? [WILDCARD] : [...grantedKeys],
            )
          }
        >
          Save permissions
        </Button>
      </div>

      <label className="flex items-start gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
          checked={hasWildcard}
          onChange={(e) => setHasWildcard(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-foreground">
            Full access
          </span>
          <span className="block text-xs text-muted-foreground">
            Grants every permission below, including ones added later. Turn
            this off to grant permissions individually instead.
          </span>
        </span>
      </label>

      <div className={cn("space-y-5", hasWildcard && "opacity-60")}>
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {group}
            </h3>
            <div className="space-y-1.5">
              {items.map((perm) => (
                <label
                  key={perm.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md px-2 py-1.5",
                    hasWildcard ? "cursor-default" : "hover:bg-muted/30 cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                    checked={hasWildcard || grantedKeys.has(perm.key)}
                    disabled={hasWildcard}
                    onChange={() => toggle(perm.key)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {perm.key}
                    </span>
                    {perm.description && (
                      <span className="block text-xs text-muted-foreground">
                        {perm.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesClient.get<AclRole[]>("/"),
  });

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsClient.get<AclPermission[]>("/"),
  });

  useEffect(() => {
    if (!selectedRoleId && roles && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { mutateAsync: createRole, isPending: creating } = useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      entraAppRole: string | null;
      precedence: number;
    }) => rolesClient.post<AclRole>("/", payload),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedRoleId(role.id);
    },
  });

  const { mutateAsync: updateRole, isPending: updating } = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      description?: string;
      entraAppRole: string | null;
      precedence: number;
    }) =>
      rolesClient.patch<AclRole>(`/${payload.id}`, {
        name: payload.name,
        description: payload.description,
        entraAppRole: payload.entraAppRole,
        precedence: payload.precedence,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const { mutate: deleteRole, isPending: deleting } = useMutation({
    mutationFn: (roleId: string) => rolesClient.delete(`/${roleId}`),
    onSuccess: (_data, roleId) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleteError(undefined);
      if (selectedRoleId === roleId) setSelectedRoleId(null);
    },
    onError: (err: unknown) => {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete role.",
      );
    },
  });

  const selectedRole = roles?.find((r) => r.id === selectedRoleId) ?? null;
  const loading = rolesLoading || catalogLoading;

  return (
    <SidebarLayout
      title="Roles"
      subtitle="Manage roles and the permissions each one grants"
    >
      <div className="mb-4">
        <Link
          to="/users"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
      </div>

      {rolesError && (
        <ErrorAlert error="Failed to load roles." refetch={() => refetchRoles()} />
      )}

      {loading && !roles ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-3">
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowNewRole(true)}
                className="gap-2 w-full"
              >
                <Plus className="h-4 w-4" />
                New role
              </Button>
            )}
            <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {(roles ?? []).map((role) => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    aria-current={isSelected}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors border-l-2",
                      isSelected
                        ? "bg-primary/10 border-l-primary"
                        : "border-l-transparent hover:bg-muted/30",
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {role.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {role.description || "No description"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="outline">
                        {role.permissions.length} permission
                        {role.permissions.length === 1 ? "" : "s"}
                      </Badge>
                      {role.entraAppRole ? (
                        <Badge variant="outline" className="text-primary border-primary/30">
                          Entra: {role.entraAppRole}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not mapped
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            {!selectedRole ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Select a role to view its permissions.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border border-border bg-card p-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      {selectedRole.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedRole.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Microsoft SSO mapping
                      </span>
                      {selectedRole.entraAppRole ? (
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {selectedRole.entraAppRole} · precedence {selectedRole.precedence}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not mapped — new SSO users land on UNASSIGNED
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowEditRole(true)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={
                          SYSTEM_ROLE_NAMES.has(selectedRole.name) || deleting
                        }
                        title={
                          SYSTEM_ROLE_NAMES.has(selectedRole.name)
                            ? `${selectedRole.name} is a system role and can't be deleted`
                            : undefined
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete role "${selectedRole.name}"? This cannot be undone.`,
                            )
                          ) {
                            deleteRole(selectedRole.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete role
                      </Button>
                    </div>
                  )}
                </div>

                {deleteError && (
                  <ErrorAlert
                    error={deleteError}
                    refetch={() => setDeleteError(undefined)}
                  />
                )}

                <div className="rounded-lg border border-border bg-card p-6">
                  {isAdmin ? (
                    <RolePermissionEditor
                      key={selectedRole.id}
                      role={selectedRole}
                      catalog={catalog ?? []}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {selectedRole.permissions.map((key) => (
                        <div key={key} className="text-sm text-foreground">
                          {key}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showNewRole} onOpenChange={setShowNewRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
          </DialogHeader>
          <FormPanel
            onSubmit={async (vals) => {
              const entraAppRole = String(vals.entraAppRole ?? "").trim();
              await createRole({
                name: String(vals.name),
                description: vals.description ? String(vals.description) : undefined,
                entraAppRole: entraAppRole ? entraAppRole : null,
                precedence: Number(vals.precedence) || 0,
              });
              setShowNewRole(false);
            }}
            onCancel={() => setShowNewRole(false)}
            loading={creating}
            error={undefined}
            submitButtonLabel="Create"
          >
            <FormInput
              fieldName="name"
              label="Name"
              placeholder="e.g. REVIEW_LEAD"
              validators={{ required: true }}
            />
            <FormInput
              fieldName="description"
              label="Description"
              placeholder="Optional"
            />
            <FormInput
              fieldName="entraAppRole"
              label="Entra App Role value"
              placeholder="e.g. ClaimsReviewLead (optional)"
              helperText="Must exactly match the Value field of an App Role in the Azure app registration, case-sensitive. Leave blank if this role isn't assigned via Microsoft SSO."
            />
            <FormInput
              fieldName="precedence"
              type="number"
              label="Precedence"
              defaultValue={0}
              helperText="If a user's Microsoft roles claim matches more than one mapped role, the higher precedence wins."
            />
          </FormPanel>
          <p className="text-xs text-muted-foreground mt-2">
            New roles start with no permissions — assign them from the role's
            page after creation.
          </p>
        </DialogContent>
      </Dialog>

      {selectedRole && (
        <Dialog open={showEditRole} onOpenChange={setShowEditRole}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {selectedRole.name}</DialogTitle>
            </DialogHeader>
            <FormPanel
              key={selectedRole.id}
              onSubmit={async (vals) => {
                const entraAppRole = String(vals.entraAppRole ?? "").trim();
                await updateRole({
                  id: selectedRole.id,
                  name: String(vals.name),
                  description: vals.description ? String(vals.description) : undefined,
                  entraAppRole: entraAppRole ? entraAppRole : null,
                  precedence: Number(vals.precedence) || 0,
                });
                setShowEditRole(false);
              }}
              onCancel={() => setShowEditRole(false)}
              loading={updating}
              error={undefined}
              submitButtonLabel="Save"
            >
              <FormInput
                fieldName="name"
                label="Name"
                defaultValue={selectedRole.name}
                readOnlyMode={SYSTEM_ROLE_NAMES.has(selectedRole.name)}
                helperText={
                  SYSTEM_ROLE_NAMES.has(selectedRole.name)
                    ? "System role names can't be changed."
                    : undefined
                }
                validators={{ required: true }}
              />
              <FormInput
                fieldName="description"
                label="Description"
                defaultValue={selectedRole.description}
                placeholder="Optional"
              />
              <FormInput
                fieldName="entraAppRole"
                label="Entra App Role value"
                defaultValue={selectedRole.entraAppRole ?? ""}
                placeholder="e.g. ClaimsReviewLead (optional)"
                helperText="Must exactly match the Value field of an App Role in the Azure app registration, case-sensitive. Clear this to stop auto-assigning this role from Microsoft SSO."
              />
              <FormInput
                fieldName="precedence"
                type="number"
                label="Precedence"
                defaultValue={selectedRole.precedence}
                helperText="If a user's Microsoft roles claim matches more than one mapped role, the higher precedence wins."
              />
            </FormPanel>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
  );
}
