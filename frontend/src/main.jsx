import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter.jsx'
import { ThemeProvider } from './theme.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './index.css'

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          background: '#ffffff',
          color: '#000000',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message || 'An error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
} else {
  try {
    console.log('Initializing React app...');
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <ThemeProvider>
              <AuthProvider>
                <AppRouter />
              </AuthProvider>
            </ThemeProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('React app initialized successfully');
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #ffffff; color: #000000; flex-direction: column; gap: 20px; padding: 20px;">
        <h1>Failed to load application</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
      </div>
    `;
  }
}
