import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';
import { USER_ROLES } from '../../config/firebaseCollections';

/**
 * RoleGuard Component
 * Protects routes based on user roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles allowed to access
 * @param {string} props.redirectTo - Path to redirect if unauthorized (default: '/home')
 * @param {React.ReactNode} props.fallback - Loading component
 */
export default function RoleGuard({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/home',
  fallback = <LoadingScreen />
}) {
  const { currentUser, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole(currentUser?.uid);

  // Show loading state
  if (authLoading || roleLoading) {
    return fallback;
  }

  // Not authenticated - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // No role restrictions - allow access
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user role is in allowed roles
  const hasAccess = allowedRoles.includes(role);

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

/**
 * AdminOnly Guard - Restricts access to admin users only
 */
export function AdminOnly({ children, redirectTo = '/home' }) {
  return (
    <RoleGuard 
      allowedRoles={[USER_ROLES.admin]} 
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * KreatorOnly Guard - Restricts access to kreator users only
 */
export function KreatorOnly({ children, redirectTo = '/home' }) {
  return (
    <RoleGuard 
      allowedRoles={[USER_ROLES.kreator, USER_ROLES.admin]} 
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * UserOnly Guard - Restricts access to regular users only (excludes admin/kreator)
 */
export function UserOnly({ children, redirectTo = '/home' }) {
  return (
    <RoleGuard 
      allowedRoles={[USER_ROLES.user]} 
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * Simple loading screen component
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
