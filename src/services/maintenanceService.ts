import { BaseRepository } from '../repositories';
import { COLLECTIONS } from '../lib/pocketbase';
import type { MaintenanceSettings } from '../types';

const SETTINGS_KEY = 'maintenance';

/** Untyped key/value settings collection. */
interface SettingRecord {
  id: string;
  key: string;
  value: unknown;
}

const settings = new BaseRepository<SettingRecord>(COLLECTIONS.SETTINGS);

export const maintenanceService = {
  async get(): Promise<MaintenanceSettings> {
    const rec = await settings.getFirst(`key = "${SETTINGS_KEY}"`);
    if (!rec) return { active: false, start_time: '', duration: '' };
    return rec.value as MaintenanceSettings;
  },

  async set(value: MaintenanceSettings): Promise<void> {
    const rec = await settings.getFirst(`key = "${SETTINGS_KEY}"`);
    if (rec) {
      await settings.update(rec.id, { value });
    } else {
      await settings.create({ key: SETTINGS_KEY, value });
    }
  },

  computeInfo(
    settingsValue: MaintenanceSettings
  ): { hoursUntil: number; duration: string; isUrgent: boolean; message?: string } | null {
    if (!settingsValue.active || !settingsValue.start_time) return null;
    const start = new Date(settingsValue.start_time);
    const diffHours = Math.round((start.getTime() - Date.now()) / 3_600_000);
    return {
      hoursUntil: diffHours,
      duration: settingsValue.duration || 'unbekannt',
      isUrgent: diffHours <= 2 && diffHours >= 0,
      message: settingsValue.message,
    };
  },
};
