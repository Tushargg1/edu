import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ROLE_HOME = {
  super_admin: '/super-admin/dashboard',
  school_admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

/**
 * ProtectedRoute — wraps routes that require authentication.
 * If not authenticated → redirect to login.
 * If roles prop provided and user's role not in list → redirect to their home.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/'} replace />;
  }

  return children;
}
