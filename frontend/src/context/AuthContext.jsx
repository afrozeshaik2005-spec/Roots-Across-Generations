import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Silent session restoration on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await api.post('/auth/refresh');
        if (response.data?.success && response.data?.accessToken) {
          setAccessToken(response.data.accessToken);
          
          // Fetch detailed profile and family memberships
          const userResponse = await api.get('/auth/me');
          if (userResponse.data?.success) {
            setUser(userResponse.data.user);
          }
        }
      } catch (err) {
        // No active session
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success && response.data?.accessToken) {
        setAccessToken(response.data.accessToken);
        
        // Fetch detailed profile and family memberships
        const userResponse = await api.get('/auth/me');
        if (userResponse.data?.success) {
          setUser(userResponse.data.user);
          return { success: true };
        }
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await api.post('/auth/signup', { email, password });
      if (response.data?.success) {
        return { success: true };
      }
      return { success: false, error: 'Failed to create account' };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Signup failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const googleLogin = async (idToken) => {
    try {
      const response = await api.post('/auth/google', { idToken });
      if (response.data?.success && response.data?.accessToken) {
        setAccessToken(response.data.accessToken);
        
        // Fetch detailed profile and family memberships
        const userResponse = await api.get('/auth/me');
        if (userResponse.data?.success) {
          setUser(userResponse.data.user);
          return { success: true };
        }
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Google login failed.';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore failures on logout and clear memory
    } finally {
      setAccessToken('');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    googleLogin,
    logout,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
