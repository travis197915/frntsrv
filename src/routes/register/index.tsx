import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormPanel, FormInput } from '@/components/FormPanel';
import { AuthLayout } from '@/layouts/AuthLayout';

export default function Register() {
  const { user, register, isLoading } = useAuth();
  const [error, setError] = useState<string | undefined>();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(undefined);
    try {
      const email = String(data.email ?? '').trim();
      const password = String(data.password ?? '');
      const name = String(data.name ?? '').trim();
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      await register(email, password, name || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="New accounts receive auditor access by default"
      footer={
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#8B2BE2] hover:text-[#7a22cc] transition-colors">
            Sign in
          </Link>
        </p>
      }
    >
      <FormPanel
        onSubmit={handleSubmit}
        loading={isLoading}
        error={error}
        submitButtonLabel="Sign up"
      >
        <FormInput
          fieldName="name"
          label="Full name"
          type="text"
          defaultValue=""
          placeholder="Jane Doe"
        />
        <FormInput
          fieldName="email"
          label="Work email"
          type="email"
          defaultValue=""
          placeholder="you@wipro.com"
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
    </AuthLayout>
  );
}
