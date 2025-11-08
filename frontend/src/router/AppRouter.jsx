import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected routes */}
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
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NavigationContext.Provider>
  );
}

export default AppRouter;

