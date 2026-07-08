import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/utils/user';

/**
 * Gate every authenticated route on a valid admin session.
 */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

export default ProtectedRoute;
