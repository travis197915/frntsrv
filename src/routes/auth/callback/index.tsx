import { useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';

/**
 * Lands here after the backend's Microsoft OAuth callback redirects the
 * browser back with either `?token=` (success) or `?error=` (pending
 * activation / cancelled). The error cases are handled by /login itself —
 * this page only ever completes a successful session.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { completeMicrosoftLogin } = useAuth();
  const started = useRef(false);

  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    completeMicrosoftLogin(token).catch(() => {
      window.location.replace('/login?error=access_denied');
    });
  }, [token, completeMicrosoftLogin]);

  if (error) {
    return <Navigate to={`/login?error=${encodeURIComponent(error)}`} replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <Loader />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
