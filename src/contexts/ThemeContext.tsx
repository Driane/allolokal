import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'premium';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void; // Cycle : light → dark → premium → light
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'app-theme';
const DEFAULT_THEME: Theme = 'light';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ['light', 'dark', 'premium'].includes(stored)) return stored;
    } catch {
      // SSR ou localStorage bloqué
    }
    return DEFAULT_THEME;
  });

  // Applique/retire les classes sur <html> à chaque changement de thème
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'premium');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'premium') root.classList.add('premium');
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Silently fail if localStorage unavailable
    }
  };

  const toggleTheme = () => {
    const cycle: Theme[] = ['light', 'dark', 'premium'];
    const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length];
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
};