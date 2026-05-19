import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import Loader from '@/components/Loader';
import { ErrorAlert } from '@/components/ErrorAlert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  USER_QUERY,
  UPDATE_USER_ROLE_MUTATION,
  UPDATE_USER_STATUS_MUTATION,
} from '@/graphql/auth.graphql';
import {
  UserRoleEnumType as RoleEnum,
  UserStatusEnumType as StatusEnum,
  type UserByIdQuery,
  type UserByIdQueryVariables,
  type UserRoleEnumType,
  type UserStatusEnumType,
} from '@/__generated__/graphql';
import StatusBadge from '@/components/StatusBadge';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { loading, error, data, refetch } = useQuery<UserByIdQuery, UserByIdQueryVariables>(USER_QUERY, {
    variables: { id: id! },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const [updateRole, { loading: roleLoading }] = useMutation(UPDATE_USER_ROLE_MUTATION, {
    onCompleted: () => refetch(),
  });
  const [updateStatus, { loading: statusLoading }] = useMutation(UPDATE_USER_STATUS_MUTATION, {
    onCompleted: () => refetch(),
  });

  const user = data?.user;

  if (!id) return null;

  if (loading && !user) {
    return (
      <SidebarLayout title="User" subtitle="Loading...">
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      </SidebarLayout>
    );
  }

  if (error || !user) {
    return (
      <SidebarLayout title="User" subtitle="Error">
        <Link to="/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
        <ErrorAlert error={error?.message ?? 'User not found'} refetch={() => refetch()} />
      </SidebarLayout>
    );
  }

  const roleOptions: UserRoleEnumType[] = [RoleEnum.Admin, RoleEnum.User];
  const statusOptions: UserStatusEnumType[] = [
    StatusEnum.Active,
    StatusEnum.Inactive,
    StatusEnum.Pending,
    StatusEnum.Suspended,
    StatusEnum.Deleted,
  ];

  return (
    <SidebarLayout title={user.name || user.email || 'User'} subtitle={user.email ?? ''}>
      <div className="mb-4">
        <Link to="/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Name</dt>
              <dd className="mt-1 font-medium text-foreground">{user.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Email</dt>
              <dd className="mt-1 font-medium text-foreground">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Role</dt>
              <dd className="mt-1">
                <StatusBadge status={user.role.toLowerCase()} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={user.status.toLowerCase()} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Created</dt>
              <dd className="mt-1 text-foreground">{user.createdAt ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Updated</dt>
              <dd className="mt-1 text-foreground">{user.updatedAt ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Last login</dt>
              <dd className="mt-1 text-foreground">{user.lastLoginAt ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Update role</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="flex h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[160px]"
              value={user.role}
              disabled={roleLoading}
              onChange={(e) =>
                updateRole({
                  variables: { id: user.id, role: e.target.value as UserRoleEnumType },
                })
              }
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {roleLoading && <span className="text-xs text-muted-foreground">Saving…</span>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Update status</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="flex h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[160px]"
              value={user.status}
              disabled={statusLoading}
              onChange={(e) =>
                updateStatus({
                  variables: { id: user.id, status: e.target.value as UserStatusEnumType },
                })
              }
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {statusLoading && <span className="text-xs text-muted-foreground">Saving…</span>}
          </div>
        </div>

        <Link to="/users" className={cn(buttonVariants({ variant: 'outline' }))}>
          Done
        </Link>
      </div>
    </SidebarLayout>
  );
}
