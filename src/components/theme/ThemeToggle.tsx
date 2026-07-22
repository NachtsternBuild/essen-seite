import type { ReactNode } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeContext } from '../../context/ThemeContext';
import type { ThemeMode } from '../../types';

const ICONS: Record<ThemeMode, ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  system: <Monitor size={18} />,
};

const NEXT: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext();

  return (
    <button
      className="btn-icon theme-toggle"
      onClick={() => setTheme(NEXT[theme])}
      title={`Theme: ${theme} (klicken zum Wechseln)`}
      aria-label={`Aktuelles Theme: ${theme}`}
    >
      {ICONS[theme]}
    </button>
  );
}
