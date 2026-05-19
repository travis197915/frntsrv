import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { LogOut, Users, ShieldCheck, Plus, RefreshCw, Upload } from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import Loader from '@/components/Loader';
import { ErrorAlert } from '@/components/ErrorAlert';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/types';
import { getAuthorizationHeader } from '@/utils/auth';
import { LICENSE_STATUS_QUERY } from '@/graphql/license.graphql';
import {
  USERS_QUERY,
  SIGNUP_MUTATION,
  UPDATE_USER_ROLE_MUTATION,
  UPDATE_USER_STATUS_MUTATION,
} from '@/graphql/auth.graphql';
import {
  UserRoleEnumType,
  type LicenseStatusQuery,
  type LicenseStatusQueryVariables,
  type UsersQuery,
  type UsersQueryVariables,
} from '@/__generated__/graphql';
import { FormPanel, FormInput } from '@/components/FormPanel';

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  return email?.charAt(0).toUpperCase() ?? '?';
}

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light mode' },
  { value: 'dark', label: 'Dark', description: 'Always use dark mode' },
  { value: 'system', label: 'System', description: 'Follow device setting' },
];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-sm font-semibold text-foreground mb-4">Appearance</h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-xs text-muted-foreground">Choose your preferred colour scheme</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              title={opt.description}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === opt.value
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, isAdmin } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backendBase = import.meta.env.VITE_GRAPHQL_BACKEND_URL?.replace('/graphql', '') ?? '';

  const { data: licenseData, loading: licenseLoading, refetch: refetchLicense } = useQuery<LicenseStatusQuery, LicenseStatusQueryVariables>(
    LICENSE_STATUS_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: usersData, loading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery<UsersQuery, UsersQueryVariables>(
    USERS_QUERY,
    { variables: { limit: 50 }, fetchPolicy: 'cache-and-network', skip: !isAdmin },
  );

  const [signupUser, { loading: creatingUser }] = useMutation(SIGNUP_MUTATION, {
    onCompleted: () => { refetchUsers(); setShowAddUser(false); },
  });

  const [updateUserRole] = useMutation(UPDATE_USER_ROLE_MUTATION, {
    onCompleted: () => refetchUsers(),
  });

  const [updateUserStatus] = useMutation(UPDATE_USER_STATUS_MUTATION, {
    onCompleted: () => refetchUsers(),
  });

  const license = licenseData?.licenseStatus;
  const users = (usersData?.users?.nodes ?? []) as any[];

  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    setUploadState('uploading');
    setUploadMessage('');

    try {
      const res = await fetch(`${backendBase}/license/upload`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthorizationHeader(),
          'Content-Type': 'application/octet-stream',
        },
        body: file,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadState('error');
        setUploadMessage(data.error ?? 'Upload failed.');
        return;
      }

      setUploadState('success');
      const tier = data.license.tier ? `${data.license.tier} tier, ` : '';
      setUploadMessage(`License updated — ${tier}${data.license.daysLeft}d remaining.`);
      refetchLicense();
    } catch {
      setUploadState('error');
      setUploadMessage('Network error. Could not reach the server.');
    }
  };

  const handleAddUser = async (values: Record<string, unknown>) => {
    const r = String(values.role ?? 'USER').toUpperCase();
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

  if (!user) return null;

  return (
    <SidebarLayout title="Settings" subtitle="Account, license, and team management">
      <div className="max-w-3xl space-y-6">

        {/* Profile */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
              {getInitials(user.name, user.email)}
            </div>
            <div>
              <p className="font-medium text-foreground">{user.name || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-border pt-4 text-xs">
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="mt-1 font-medium text-foreground">{getRoleLabel(user.role)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 capitalize text-foreground">{user.status?.toLowerCase()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Login</dt>
              <dd className="mt-1 text-foreground">{user.lastLoginAt ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Appearance */}
        <AppearanceSection />

        {/* License */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              License
            </h2>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".cert"
                    className="hidden"
                    onChange={handleLicenseUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadState === 'uploading'}
                  >
                    <Upload className={`h-3 w-3 mr-1.5 ${uploadState === 'uploading' ? 'animate-pulse' : ''}`} />
                    {uploadState === 'uploading' ? 'Uploading…' : 'Upload License'}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchLicense()}
                disabled={licenseLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${licenseLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          {uploadMessage && (
            <p className={`text-xs mb-4 px-3 py-2 rounded ${
              uploadState === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              {uploadMessage}
            </p>
          )}
          {licenseLoading && !license ? (
            <div className="flex justify-center py-4">
              <Loader />
            </div>
          ) : !license ? (
            <p className="text-sm text-muted-foreground text-center py-4">No license file found.</p>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1"><StatusBadge status={license.status.toLowerCase()} /></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tier</dt>
                <dd className="mt-1 font-medium text-foreground capitalize">{license.tier}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Days Left</dt>
                <dd className={`mt-1 font-bold ${
                  license.daysLeft <= 0 ? 'text-red-500' :
                  license.daysLeft < 30 ? 'text-amber-500' :
                  'text-green-500'
                }`}>
                  {license.daysLeft <= 0 ? 'Expired' : `${license.daysLeft}d`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Client ID</dt>
                <dd className="mt-1 font-mono text-foreground truncate">{license.clientId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Max Agents</dt>
                <dd className="mt-1 font-medium text-foreground">{license.maxAgents}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="mt-1 text-foreground">{license.expiresAt}</dd>
              </div>
              {license.features?.length > 0 && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground mb-1">Features</dt>
                  <dd className="flex flex-wrap gap-1">
                    {license.features.map((f: string) => (
                      <span key={f} className="bg-muted px-1.5 py-0.5 rounded text-foreground">{f}</span>
                    ))}
                  </dd>
                </div>
              )}
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground">License ID</dt>
                <dd className="mt-1 font-mono text-muted-foreground text-xs">{license.licenseId}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* User Management — admin only */}
        {isAdmin && (
          <div className="rounded-lg border border-border bg-card">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Users
              </h2>
              <Button size="sm" onClick={() => setShowAddUser(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add User
              </Button>
            </div>

            {showAddUser && (
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-medium mb-4">New User</h3>
                <FormPanel
                  onSubmit={handleAddUser}
                  onCancel={() => setShowAddUser(false)}
                  loading={creatingUser}
                  error={undefined}
                  submitButtonLabel="Create"
                >
                  <FormInput fieldName="name" label="Name" validators={{ required: true }} />
                  <FormInput fieldName="email" label="Email" validators={{ required: true }} />
                  <FormInput fieldName="password" label="Password" validators={{ required: true }} />
                  <FormInput fieldName="role" label="Role (USER or ADMIN)" />
                </FormPanel>
              </div>
            )}

            {usersError && (
              <div className="px-6 py-4">
                <ErrorAlert error="Failed to load users." refetch={() => refetchUsers()} />
              </div>
            )}

            {usersLoading && users.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">User</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u: any) => (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-foreground text-sm">{u.name || u.email}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-6 py-3 hidden sm:table-cell">
                          <StatusBadge status={u.role?.toLowerCase()} />
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={String(u.status).toLowerCase()} />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {u.id !== user?.id && (
                              <>
                                <button
                                  onClick={() => updateUserRole({
                                    variables: {
                                      id: u.id,
                                      role: u.role === 'ADMIN' ? 'USER' : 'ADMIN',
                                    },
                                  })}
                                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                                  title="Toggle role"
                                >
                                  {u.role === 'ADMIN' ? 'Make User' : 'Make Admin'}
                                </button>
                                <button
                                  onClick={() => updateUserStatus({
                                    variables: {
                                      id: u.id,
                                      status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                    },
                                  })}
                                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                                  title="Toggle status"
                                >
                                  {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </button>
                              </>
                            )}
                            {u.id === user?.id && (
                              <span className="text-xs text-muted-foreground italic">You</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Session */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Session</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground">End your current session</p>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
