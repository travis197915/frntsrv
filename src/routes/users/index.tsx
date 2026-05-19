import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { Search, Plus } from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import Loader from '@/components/Loader';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormPanel, FormInput } from '@/components/FormPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  USERS_QUERY,
  SIGNUP_MUTATION,
} from '@/graphql/auth.graphql';
import type { UsersQuery, UsersQueryVariables } from '@/__generated__/graphql';
import { UserRoleEnumType } from '@/__generated__/graphql';
import debounce from '@/utils/debounce';
import StatusBadge from '@/components/StatusBadge';

export default function UsersListPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  const { data, loading, error, fetchMore, refetch } = useQuery<UsersQuery, UsersQueryVariables>(USERS_QUERY, {
    variables: { limit: 20 },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  });

  const [signupUser, { loading: creating }] = useMutation(SIGNUP_MUTATION, {
    refetchQueries: ['Users'],
  });

  const users = data?.users.nodes ?? [];
  const pageInfo = data?.users.pageInfo;

  const handleAddUser = async (values: Record<string, unknown>) => {
    const r = String(values.role ?? '').toUpperCase();
    const role = r === 'ADMIN' ? UserRoleEnumType.Admin : UserRoleEnumType.User;
    await signupUser({
      variables: {
        email: String(values.email),
        password: String(values.password),
        name: String(values.name),
        role,
      },
    });
  };

  const debouncedSearch = debounce((text: string) => {
    refetch({
      filters: { text: text || undefined },
      cursor: undefined,
      limit: 20,
    });
  }, 300);

  return (
    <SidebarLayout title="Users" subtitle="Browse and manage team accounts">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xs w-full">
            <Input
              leadingIcon={<Search className="h-4 w-4 shrink-0" aria-hidden />}
              placeholder="Search users..."
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2 shrink-0">
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
              <FormInput fieldName="name" label="Name" validators={{ required: true }} />
              <FormInput fieldName="email" label="Email" type="email" validators={{ required: true }} />
              <FormInput fieldName="password" label="Password" type="password" validators={{ required: true }} />
              <FormInput fieldName="role" label="Role (USER or ADMIN)" />
            </FormPanel>
          </DialogContent>
        </Dialog>

        {error && <ErrorAlert error="Failed to load users." refetch={() => refetch()} />}

        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No users found.</p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
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
                          <p className="font-medium text-foreground">{u.name || u.email}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <StatusBadge status={u.role?.toLowerCase()} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={String(u.status).toLowerCase()} />
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
                    fetchMore({
                      variables: { cursor: pageInfo.cursor, limit: 20 },
                      updateQuery: (prev, { fetchMoreResult }) => {
                        if (!fetchMoreResult?.users) return prev;
                        return {
                          users: {
                            ...fetchMoreResult.users,
                            nodes: [...prev.users.nodes, ...fetchMoreResult.users.nodes],
                          },
                        };
                      },
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
