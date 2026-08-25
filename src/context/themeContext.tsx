import React, { createContext, useContext, useState, useEffect } from 'react';

export type SystemThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: SystemThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: SystemThemeMode) => void;
  isDark: boolean;
}

const THEME_STORAGE_KEY = 'system_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  toggleTheme: () => {},
  setThemeMode: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeState] = useState<SystemThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      console.warn('Failed to read theme preference from localStorage:', e);
    }
    return 'light';
  });

  const isDark = themeMode === 'dark';

  const setThemeMode = (mode: SystemThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference to localStorage:', e);
    }
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  // 同步更新 document.body 上的属性和类名
  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode);
    document.documentElement.setAttribute('data-theme', themeMode);
    if (themeMode === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
