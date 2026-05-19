import { Navigate } from 'react-router-dom';

// Profile has been merged into Settings
export default function ProfileRoute() {
  return <Navigate to="/settings" replace />;
}
