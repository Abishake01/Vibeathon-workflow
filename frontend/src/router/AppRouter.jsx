import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WorkflowBuilder from '../components/workflow/WorkflowBuilder';
import PageBuilder from '../components/ui-builder/PageBuilder';
import Login from '../components/auth/Login';
import Signup from '../components/auth/Signup';

// Create navigation context
export const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    // Return a safe fallback instead of throwing
    console.warn('useNavigation called outside NavigationProvider, using fallback');
    return {
      activeTab: 'workflow',
      navigateToBuilder: () => console.warn('Navigation not available')
    };
  }
  return context;
};

// Protected Route Component - Redirects unauthenticated users to login
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-router" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#ffffff',
        color: '#000000'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public Route Component - Redirects authenticated users away from login/signup
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-router" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#ffffff',
        color: '#000000'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    // If already authenticated, redirect to home
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRouter() {
  const [activeTab, setActiveTab] = useState(() => {
    // Load active tab from localStorage
    return localStorage.getItem('activeBuilderTab') || 'workflow';
  });

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeBuilderTab', activeTab);
  }, [activeTab]);

  const navigateToBuilder = (builder) => {
    setActiveTab(builder);
  };

  return (
    <NavigationContext.Provider value={{ activeTab, navigateToBuilder }}>
      <Routes>
        {/* Public routes - redirect to home if already authenticated */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes - redirect to login if not authenticated */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="app-router">
                {activeTab === 'workflow' && <WorkflowBuilder />}
                {activeTab === 'page-builder' && <PageBuilder />}
              </div>
            </ProtectedRoute>
          }
        />
        
        {/* Redirect unknown routes - protected, so will redirect to login if not authenticated */}
        <Route 
          path="*" 
          element={
            <ProtectedRoute>
              <Navigate to="/" replace />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </NavigationContext.Provider>
  );
}

export default AppRouter;

