/**
 * Small typed wrapper over localStorage for client-side user preferences.
 * Values are JSON-encoded; reads never throw (fall back to the default).
 */
const PREFIX = 'meal_planner_pref_';

export function getPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setPref<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    // Notify same-tab listeners (the storage event only fires across tabs).
    window.dispatchEvent(new CustomEvent('pref-change', { detail: { key } }));
  } catch {
    // storage full / unavailable — non-critical
  }
}

/** Known preference keys (kept here so they don't drift across the app). */
export const PREF_DESKTOP_NOTIFICATIONS = 'notifications.desktop';
