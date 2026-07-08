import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormPanel, FormInput } from '@/components/FormPanel';
import { AuthLayout } from '@/layouts/AuthLayout';

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const [error, setError] = useState<string | undefined>();

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
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:text-[#e5551f] transition-colors">
            Sign up
          </Link>
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
