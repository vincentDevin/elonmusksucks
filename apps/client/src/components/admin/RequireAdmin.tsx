// Rollback: Delete this file and restore Navigate redirect in AppRoutes.tsx
import { useAuth } from '../../contexts/AuthContext';
import { AdminProvider } from '../../contexts/AdminContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Forbidden</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this administrative area.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">Error 403: Administrator privileges required</p>
          </div>
        </div>
      </div>
    );
  }

  return <AdminProvider>{children}</AdminProvider>;
}
