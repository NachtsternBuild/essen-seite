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
  /** Custom accent colour (hex), or null to use the built-in default. */
  accent: string | null;
  setAccent: (hex: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'meal_planner_theme';
const ACCENT_KEY = 'meal_planner_accent';

function applyAccent(hex: string | null): void {
  const root = document.documentElement;
  if (hex) root.style.setProperty('--accent', hex);
  else root.style.removeProperty('--accent');
}

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
  const [accent, setAccentState] = useState<string | null>(() => {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored) applyAccent(stored);
    return stored || null;
  });

  useEffect(() => {
    const effective = applyTheme(theme);
    setEffectiveTheme(effective);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    if (accent) localStorage.setItem(ACCENT_KEY, accent);
    else localStorage.removeItem(ACCENT_KEY);
  }, [accent]);

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
  const setAccent = useCallback((hex: string | null) => setAccentState(hex), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be inside ThemeProvider');
  return ctx;
}
