import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { setAccessToken } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * AuthCallback — handles OAuth redirects (Google) by extracting the JWT token
 * from the URL hash or query params immediately, storing it, and navigating to
 * the correct landing page. No 404 flash occurs because React Router catches
 * /auth/callback before the catch-all.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    // Prevent double execution in Strict Mode
    if (processed.current) return;
    processed.current = true;

    // Check both query params and hash fragments
    const params = new URLSearchParams(location.search);
    let token = params.get('token');

    // Also check hash fragment (some OAuth flows put token in hash)
    if (!token && location.hash) {
      const hashParams = new URLSearchParams(location.hash.replace('#', ''));
      token = hashParams.get('token') || hashParams.get('id_token');
    }

    const redirectTo = params.get('redirectTo');

    if (token) {
      // Store access token globally immediately — no fetch delay
      setAccessToken(token);

      // Fetch authenticated user profile
      api
        .get('/auth/me')
        .then((res) => {
          if (res.data?.success) {
            setUser(res.data.user);
            if (redirectTo) {
              navigate(redirectTo, { replace: true });
            } else if (res.data.user?.memberships && res.data.user.memberships.length > 0) {
              navigate('/dashboard', { replace: true });
            } else {
              navigate('/onboarding', { replace: true });
            }
          } else {
            // Fallback to login page on failure
            navigate(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login', { replace: true });
          }
        })
        .catch(() => {
          navigate(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login', { replace: true });
        });
    } else {
      // No token – go to login
      navigate(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login', { replace: true });
    }
  }, [location.search, location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
          Signing you in...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
