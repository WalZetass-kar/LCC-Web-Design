import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const themes = {
  blue: {
    name: 'Professional Blue',
    primary: 'from-slate-900 via-slate-800 to-slate-900',
    accent: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    accentSolid: 'bg-blue-500 hover:bg-blue-600',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-400/20',
    glass: 'bg-blue-500/5'
  },
  purple: {
    name: 'Elegant Purple',
    primary: 'from-slate-900 via-slate-800 to-slate-900',
    accent: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    accentSolid: 'bg-purple-500 hover:bg-purple-600',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/20',
    border: 'border-purple-400/20',
    glass: 'bg-purple-500/5'
  },
  green: {
    name: 'Modern Green',
    primary: 'from-slate-900 via-slate-800 to-slate-900',
    accent: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
    accentSolid: 'bg-emerald-500 hover:bg-emerald-600',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
    border: 'border-emerald-400/20',
    glass: 'bg-emerald-500/5'
  },
  slate: {
    name: 'Classic Slate',
    primary: 'from-slate-900 via-slate-800 to-slate-900',
    accent: 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800',
    accentSolid: 'bg-slate-600 hover:bg-slate-700',
    text: 'text-slate-300',
    glow: 'shadow-slate-500/20',
    border: 'border-slate-400/20',
    glass: 'bg-slate-500/5'
  },
  indigo: {
    name: 'Corporate Indigo',
    primary: 'from-slate-900 via-slate-800 to-slate-900',
    accent: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
    accentSolid: 'bg-indigo-500 hover:bg-indigo-600',
    text: 'text-indigo-300',
    glow: 'shadow-indigo-500/20',
    border: 'border-indigo-400/20',
    glass: 'bg-indigo-500/5'
  },
  teal: {
    name: 'Business Teal',
    primary: 'from-slate-900 via-slate-800 to-slate-900',
    accent: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
    accentSolid: 'bg-teal-500 hover:bg-teal-600',
    text: 'text-teal-300',
    glow: 'shadow-teal-500/20',
    border: 'border-teal-400/20',
    glass: 'bg-teal-500/5'
  }
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Validate if saved theme exists in new themes
    const validThemes = ['blue', 'purple', 'green', 'slate', 'indigo', 'teal'];
    return validThemes.includes(savedTheme) ? savedTheme : 'blue';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const currentTheme = themes[theme];
    if (currentTheme) {
      document.body.className = `bg-gradient-to-br ${currentTheme.primary} min-h-screen`;
    }
  }, [theme]);

  const changeTheme = (newTheme) => {
    if (themes[newTheme]) {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themes, changeTheme, currentTheme: themes[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};
