import { useSelector } from 'react-redux';

/**
 * Custom hook to access auth state from Redux.
 * Returns the current user, token, role, and authentication status.
 */
export default function useAuth() {
  const { user, token } = useSelector((state) => state.auth);

  return {
    user,
    token,
    role: user?.role ?? null,
    isAuthenticated: !!token,
  };
}
