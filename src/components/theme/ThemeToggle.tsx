import { useThemeContext } from '../../context/ThemeContext';
import type { ThemeMode } from '../../types';

const LABELS: Record<ThemeMode, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
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
      {LABELS[theme]}
    </button>
  );
}
