import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/SearchInput";
import { FormPanel, FormInput } from "@/components/FormPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { relayClient, usersClient } from "@/lib/clients";
import debounce from "@/utils/debounce";
import {
  appendCursorPage,
  buildListQuery,
  type PaginatedList,
} from "@/utils/query-pagination";
import StatusBadge from "@/components/StatusBadge";

type UserRow = {
  id: string;
  name?: string;
  email: string;
  role?: string;
  isActive: boolean;
};

type UserList = PaginatedList<UserRow>;

export default function UsersListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", "list", { limit: 20, search: searchText }],
    queryFn: () =>
      usersClient.get<UserList>(`/?${buildListQuery({ limit: 20, search: searchText })}`),
  });

  const { mutateAsync: signupUser, isPending: creating } = useMutation({
    mutationFn: (payload: { email: string; password: string; name?: string }) =>
      relayClient.post("/register", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const users = data?.nodes ?? [];
  const pageInfo = data?.pageInfo;

  const handleAddUser = async (values: Record<string, unknown>) => {
    await signupUser({
      email: String(values.email),
      password: String(values.password),
      name: String(values.name),
    });
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  return (
    <SidebarLayout title="Users" subtitle="Browse and manage team accounts">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xs w-full">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users..."
            />
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowAdd(true)}
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          )}
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New user</DialogTitle>
            </DialogHeader>
            <FormPanel
              onSubmit={async (vals) => {
                await handleAddUser(vals);
                setShowAdd(false);
              }}
              onCancel={() => setShowAdd(false)}
              loading={creating}
              error={undefined}
              submitButtonLabel="Create"
            >
              <FormInput
                fieldName="name"
                label="Name"
                validators={{ required: true }}
              />
              <FormInput
                fieldName="email"
                label="Email"
                type="email"
                validators={{ required: true }}
              />
              <FormInput
                fieldName="password"
                label="Password"
                type="password"
                validators={{ required: true }}
              />
              <FormInput fieldName="role" label="Role (USER or ADMIN)" />
            </FormPanel>
          </DialogContent>
        </Dialog>

        {error && (
          <ErrorAlert error="Failed to load users." refetch={() => refetch()} />
        )}

        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No users found.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        User
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                        Role
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/users/${u.id}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {u.name || u.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <StatusBadge status={u.role?.toLowerCase() ?? ""} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={u.isActive ? "active" : "inactive"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pageInfo?.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  loading={loading}
                  onClick={() =>
                    appendCursorPage({
                      queryClient,
                      queryKey: ["users", "list", { limit: 20, search: searchText }],
                      cursor: pageInfo.cursor,
                      fetchPage: (cursor) =>
                        usersClient.get<UserList>(
                          `/?${buildListQuery({ limit: 20, cursor, search: searchText })}`,
                        ),
                    })
                  }
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
