import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ancestral-50">
        <div className="relative flex items-center justify-center">
          {/* Elegant spinning gold rings */}
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-ancestral-500"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-r-2 border-l-2 border-gold-400 absolute"></div>
          <span className="absolute text-xl">🕊</span>
        </div>
        <h2 className="mt-6 font-display font-medium text-ancestral-700 tracking-wide">
          Connecting to Ancestry...
        </h2>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
