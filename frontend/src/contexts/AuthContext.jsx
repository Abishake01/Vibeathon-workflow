import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const authCheckIntervalRef = useRef(null);
  const isInitializedRef = useRef(false);

  /**
   * Load user from localStorage on mount
   */
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.warn('Failed to load user from localStorage:', e);
      localStorage.removeItem('authUser');
    }
  }, []);

  /**
   * Check authentication status with improved error handling
   */
  const checkAuthStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        console.log('🔍 Checking authentication status...');
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 5000);
      });

      // Race between the API call and timeout
      let response;
      try {
        response = await Promise.race([
          apiService.checkAuth(),
          timeoutPromise
        ]);
      } catch (error) {
        if (error.message === 'Auth check timeout') {
          if (!silent) {
            console.warn('⚠️ Auth check timed out - backend may not be available');
          }
        } else if (error.status === 401) {
          // Unauthorized - user is not authenticated
          if (!silent) {
            console.log('ℹ️ User is not authenticated');
          }
        } else {
          if (!silent) {
            console.error('❌ Auth check error:', error);
          }
        }
        response = null;
      }

      if (response && response.authenticated && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        if (!silent) {
          console.log('✅ User is authenticated:', response.user.username);
        }
        return { authenticated: true, user: response.user };
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('authUser');
        if (!silent) {
          console.log('ℹ️ User is not authenticated');
        }
        return { authenticated: false, user: null };
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setError(error.message);
      localStorage.removeItem('authUser');
      return { authenticated: false, user: null, error: error.message };
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    console.log('🚀 AuthProvider: Initializing...');

    const initialize = async () => {
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Auth initialization timeout');
        setLoading(false);
        setIsAuthenticated(false);
      }, 10000); // 10 seconds timeout

      try {
        // Step 1: Check if we have stored tokens
        const storedAccessToken = localStorage.getItem('accessToken');
        if (storedAccessToken) {
          console.log('📡 Found stored access token');
          // Token will be used automatically by API service
        }

        // Step 2: Check authentication status
        await checkAuthStatus(false);
        clearTimeout(timeoutId);

        // Step 3: Set up periodic auth check (every 5 minutes)
        if (authCheckIntervalRef.current) {
          clearInterval(authCheckIntervalRef.current);
        }
        authCheckIntervalRef.current = setInterval(() => {
          checkAuthStatus(true); // Silent check
        }, 5 * 60 * 1000); // 5 minutes

      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        clearTimeout(timeoutId);
        setLoading(false);
        setIsAuthenticated(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
      }
    };
  }, [checkAuthStatus]);

  /**
   * Listen for unauthorized events
   */
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('🔒 Unauthorized event received - clearing auth state');
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authUser');
      // Optionally redirect to login
      if (!window.location.pathname.includes('/login')) {
        // Don't force redirect, let the app handle it
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Sign up new user
   */
  const signup = useCallback(async (userData) => {
    try {
      setError(null);
      console.log('📝 Signing up user...');
      
      const response = await apiService.signup(userData);
      
      if (response && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        console.log('✅ Signup successful:', response.user.username);
        return { success: true, user: response.user };
      }
      
      throw new Error('Signup failed - no user data received');
    } catch (error) {
      console.error('❌ Signup error:', error);
      const errorMessage = error.response?.message || 
                          error.response?.error || 
                          error.response?.detail ||
                          error.message || 
                          'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign in user
   */
  const signin = useCallback(async (username, password) => {
    try {
      setError(null);
      console.log('🔐 Signing in user...');
      
      const response = await apiService.signin({ username, password });
      
      if (response && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        console.log('✅ Signin successful:', response.user.username);
        
        // Refresh auth check after successful login
        setTimeout(() => {
          checkAuthStatus(true);
        }, 1000);
        
        return { success: true, user: response.user };
      }
      
      throw new Error('Login failed - no user data received');
    } catch (error) {
      console.error('❌ Signin error:', error);
      const errorMessage = error.response?.error || 
                          error.response?.message || 
                          error.response?.detail ||
                          error.message || 
                          'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [checkAuthStatus]);

  /**
   * Sign out user
   */
  const signout = useCallback(async () => {
    try {
      console.log('🚪 Signing out user...');
      await apiService.signout();
    } catch (error) {
      console.error('❌ Signout error:', error);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      localStorage.removeItem('authUser');
      console.log('✅ Signout complete');
    }
  }, []);

  /**
   * Refresh authentication status
   */
  const refreshAuth = useCallback(async () => {
    return await checkAuthStatus(false);
  }, [checkAuthStatus]);

  const value = {
    user,
    loading,
    isAuthenticated,
    error,
    signup,
    signin,
    signout,
    checkAuthStatus,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
