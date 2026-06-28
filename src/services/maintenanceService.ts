import { pb, COLLECTIONS } from '../lib/pocketbase';
import type { MaintenanceSettings } from '../types';

const SETTINGS_KEY = 'maintenance';

export const maintenanceService = {
  async get(): Promise<MaintenanceSettings> {
    try {
      const rec = await pb
        .collection(COLLECTIONS.SETTINGS)
        .getFirstListItem(`key = "${SETTINGS_KEY}"`);
      return rec.value as MaintenanceSettings;
    } catch {
      return { active: false, start_time: '', duration: '' };
    }
  },

  async set(settings: MaintenanceSettings): Promise<void> {
    try {
      const rec = await pb
        .collection(COLLECTIONS.SETTINGS)
        .getFirstListItem(`key = "${SETTINGS_KEY}"`);
      await pb
        .collection(COLLECTIONS.SETTINGS)
        .update(rec.id, { value: settings });
    } catch {
      // Record doesn't exist — create it
      await pb
        .collection(COLLECTIONS.SETTINGS)
        .create({ key: SETTINGS_KEY, value: settings });
    }
  },

  computeInfo(
    settings: MaintenanceSettings
  ): { hoursUntil: number; duration: string; isUrgent: boolean; message?: string } | null {
    if (!settings.active || !settings.start_time) return null;
    const start = new Date(settings.start_time);
    const diffHours = Math.round((start.getTime() - Date.now()) / 3_600_000);
    return {
      hoursUntil: diffHours,
      duration: settings.duration || 'unbekannt',
      isUrgent: diffHours <= 2 && diffHours >= 0,
      message: settings.message,
    };
  },
};
