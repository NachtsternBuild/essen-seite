import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { ThemeMode } from '../types';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'meal_planner_theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const effective = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.setAttribute('data-theme', effective);
  return effective;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'system';
  });
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
    applyTheme((localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'system')
  );

  useEffect(() => {
    const effective = applyTheme(theme);
    setEffectiveTheme(effective);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Re-apply when system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        setEffectiveTheme(applyTheme('system'));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be inside ThemeProvider');
  return ctx;
}
