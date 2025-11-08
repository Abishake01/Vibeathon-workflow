import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    name: 'light',
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    surface: '#f8f9fa',
    border: '#e0e0e0',
    borderHover: '#d0d0d0',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    hover: '#f5f5f5',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    name: 'dark',
    background: '#0a0a0a',
    backgroundSecondary: '#1a1a1a',
    surface: '#1a1a1a',
    border: '#333333',
    borderHover: '#555555',
    text: '#ffffff',
    textSecondary: '#cccccc',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    hover: '#2a2a2a',
    shadow: 'rgba(0, 0, 0, 0.5)',
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('workflow-theme');
    if (saved) return saved;
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('workflow-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: themes[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
