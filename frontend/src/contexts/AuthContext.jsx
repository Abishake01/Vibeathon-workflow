import { createContext, useContext, useState, useEffect } from 'react';
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

  // Define checkAuthStatus first
  const checkAuthStatus = async () => {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 2000); // Reduced to 2 seconds
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
          console.warn('Auth check timed out - backend may not be available');
        } else {
          console.error('Auth check error:', error);
        }
        response = null;
      }
      
      if (response && response.authenticated && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        localStorage.setItem('authUser', JSON.stringify(response.user));
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('authUser');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authUser');
    } finally {
      setLoading(false);
    }
  };

  // Check authentication status on mount and get CSRF token
  useEffect(() => {
    console.log('AuthProvider: Initializing auth check...');
    
    // First get CSRF token, then check auth
    const initialize = async () => {
      // Set a timeout to ensure loading state doesn't hang forever
      const timeoutId = setTimeout(() => {
        console.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
        setIsAuthenticated(false);
      }, 2000); // Reduced to 2 seconds for faster response

      try {
        // Fetch CSRF token first to ensure cookie is set (with timeout)
        const csrfController = new AbortController();
        const csrfTimeout = setTimeout(() => {
          csrfController.abort();
          console.warn('CSRF fetch timeout');
        }, 1000); // 1 second timeout
        
        try {
          await fetch(`${apiService.baseURL}/auth/csrf-token/`, {
            method: 'GET',
            credentials: 'include',
            signal: csrfController.signal,
          });
        } catch (err) {
          console.warn('CSRF token fetch failed:', err);
          // Continue even if CSRF fails
        } finally {
          clearTimeout(csrfTimeout);
        }
        
        // Then check actual auth status (with timeout)
        await checkAuthStatus();
        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
        clearTimeout(timeoutId);
        // Ensure loading is set to false
        setLoading(false);
        setIsAuthenticated(false);
      }
    };
    initialize();
  }, []);

  const signup = async (userData) => {
    try {
      const response = await apiService.signup(userData);
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        return { success: true, user: response.user };
      }
      throw new Error('Signup failed');
    } catch (error) {
      console.error('Signup error:', error);
      // Extract detailed error message from response
      const errorMessage = error.response?.message || error.response?.error || error.message || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const signin = async (username, password) => {
    try {
      const response = await apiService.signin({ username, password });
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        return { success: true, user: response.user };
      }
      throw new Error('Login failed');
    } catch (error) {
      console.error('Signin error:', error);
      // Extract detailed error message from response
      const errorMessage = error.response?.error || error.response?.message || error.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const signout = async () => {
    try {
      await apiService.signout();
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authUser');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signup,
    signin,
    signout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

