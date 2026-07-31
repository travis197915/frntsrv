import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Loader from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { usersClient } from "@/lib/clients";
import StatusBadge from "@/components/StatusBadge";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    isLoading: loading,
    error,
    data: user,
  } = useQuery({
    queryKey: ["users", id],
    queryFn: () =>
      usersClient.get<{
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      }>(`/${id}`),
    enabled: !!id,
  });



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
        <Link
          to="/users"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
        <ErrorAlert error={(error as Error)?.message ?? "User not found"} />
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout
      title={user.name || user.email || "User"}
      subtitle={user.email ?? ""}
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

      <div className="max-w-xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Name</dt>
              <dd className="mt-1 font-medium text-foreground">
                {user.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Email</dt>
              <dd className="mt-1 font-medium text-foreground">
                {user.email ?? "—"}
              </dd>
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
                <StatusBadge status={user.isActive ? "active" : "inactive"} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Created</dt>
              <dd className="mt-1 text-foreground">{user.createdAt ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Updated</dt>
              <dd className="mt-1 text-foreground">{user.updatedAt ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </SidebarLayout>
  );
}
