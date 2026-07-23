import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormPanel, FormInput } from '@/components/FormPanel';
import { AuthLayout } from '@/layouts/AuthLayout';
import { buttonVariants } from '@/components/ui/button';
import { AUTH_BASE } from '@/lib/api';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  pending_activation:
    'Your account is awaiting admin activation. Contact your administrator.',
  access_denied: 'Sign-in with Microsoft was cancelled.',
};

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const ssoError = searchParams.get('error');
  const [error, setError] = useState<string | undefined>(
    ssoError ? (SSO_ERROR_MESSAGES[ssoError] ?? 'Sign-in failed. Please try again.') : undefined,
  );

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(undefined);
    try {
      const email = String(data.email ?? '').trim();
      const password = String(data.password ?? '');
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your Unit Health Care dashboard"
      footer={
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need an account? Ask an administrator to create one for you.
        </p>
      }
    >
      <FormPanel
        onSubmit={handleSubmit}
        loading={isLoading}
        error={error}
        submitButtonLabel="Sign in"
      >
        <FormInput
          fieldName="email"
          label="Work email"
          type="email"
          defaultValue=""
          placeholder="you@optum.com"
          validators={{ required: true, isEmail: true }}
        />
        <FormInput
          fieldName="password"
          label="Password"
          type="password"
          defaultValue=""
          placeholder="••••••••"
          validators={{ required: true }}
        />
      </FormPanel>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <a
        href={`${AUTH_BASE}/auth/microsoft/login?origin=claims-frontend`}
        className={buttonVariants({ variant: 'outline', className: 'mt-5 w-full' })}
      >
        <svg className="size-4" viewBox="0 0 21 21" aria-hidden="true">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        Sign in with Microsoft
      </a>

      <div className="mt-5 flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input bg-background accent-primary focus:ring-primary/20"
          />
          <span className="text-sm">Remember me</span>
        </label>
        <a href="#" className="text-sm font-medium text-primary hover:text-[#e5551f] transition-colors">
          Forgot password?
        </a>
      </div>
    </AuthLayout>
  );
}
