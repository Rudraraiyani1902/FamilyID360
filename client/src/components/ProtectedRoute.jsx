import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, initialLoading } = useAuth();
  const location = useLocation();

  // Show spinner while checking backend auth on startup
  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Verifying Gujarat State Citizen Session…</p>
      </div>
    );
  }

  // If not authenticated, redirect to login with return target
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is restricted and user does not match
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'officer') {
      return <Navigate to="/officer/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
