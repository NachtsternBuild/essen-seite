import { BaseRepository } from '../repositories';
import { COLLECTIONS } from '../lib/pocketbase';
import type { AppSettings } from '../types';

/** Key under which the global defaults document is stored in `settings`. */
const APP_SETTINGS_KEY = 'app_defaults';

/**
 * Factory-default global settings. New installations and any unset field fall
 * back to these, so the app always has a complete, valid configuration.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  default_color: '#d97706',
  default_language: 'de',
  default_timezone: 'Europe/Berlin',
  default_currency: 'EUR',
  default_order_deadline: '08:30',
  default_export: 'pdf',
  default_theme: 'system',
};

interface SettingRecord {
  id: string;
  key: string;
  value: unknown;
}

const settings = new BaseRepository<SettingRecord>(COLLECTIONS.SETTINGS);

export const settingsService = {
  /** Reads the global defaults, merged over factory defaults for completeness. */
  async getAppSettings(): Promise<AppSettings> {
    const rec = await settings.getFirst(`key = "${APP_SETTINGS_KEY}"`);
    if (!rec) return { ...DEFAULT_APP_SETTINGS };
    return { ...DEFAULT_APP_SETTINGS, ...(rec.value as Partial<AppSettings>) };
  },

  /** Persists (a subset of) the global defaults, creating the record if needed. */
  async updateAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const rec = await settings.getFirst(`key = "${APP_SETTINGS_KEY}"`);
    const current = rec
      ? { ...DEFAULT_APP_SETTINGS, ...(rec.value as Partial<AppSettings>) }
      : { ...DEFAULT_APP_SETTINGS };
    const next: AppSettings = { ...current, ...patch };

    if (rec) {
      await settings.update(rec.id, { value: next });
    } else {
      await settings.create({ key: APP_SETTINGS_KEY, value: next });
    }
    return next;
  },

  /** Generic typed access to any key/value setting document. */
  async getValue<T>(key: string, fallback: T): Promise<T> {
    const rec = await settings.getFirst(`key = "${key}"`);
    return rec ? (rec.value as T) : fallback;
  },

  async setValue<T>(key: string, value: T): Promise<void> {
    const rec = await settings.getFirst(`key = "${key}"`);
    if (rec) {
      await settings.update(rec.id, { value });
    } else {
      await settings.create({ key, value });
    }
  },
};
