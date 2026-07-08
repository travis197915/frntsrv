import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { useAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggleButton />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-lg border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Access denied</h1>
          <p className="mt-2 text-muted-foreground">
            This platform is restricted to admin users. Auditors should use the Claims Audit Review application.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Return to sign in
          </button>
          <p className="mt-4 text-xs text-muted-foreground">
            Need access? Contact an administrator to upgrade your account role.
          </p>
        </div>
      </div>
    </div>
  );
}
