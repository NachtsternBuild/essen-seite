import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import { useToastContext } from '../context/ToastContext';

const STATISTICS_KEY = 'statistics_enabled';

/**
 * Global, superuser-controlled feature switches (backed by the `settings`
 * collection). Unlike client-local preferences, these apply to every user —
 * regular users/admins can see the current state but only a superuser may
 * change it.
 */
export function useFeatureFlags(isSuperuser: boolean) {
  const { addToast } = useToastContext();
  const [statisticsEnabled, setStatisticsEnabledState] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const enabled = await settingsService.getValue(STATISTICS_KEY, true);
      setStatisticsEnabledState(enabled);
    } catch {
      // non-fatal — default stays enabled
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setStatisticsEnabled = useCallback(
    async (value: boolean) => {
      if (!isSuperuser) {
        addToast('Nur Superuser dürfen Statistiken aktivieren/deaktivieren.', 'error');
        return;
      }
      try {
        await settingsService.setValue(STATISTICS_KEY, value);
        setStatisticsEnabledState(value);
        addToast(value ? 'Statistiken aktiviert.' : 'Statistiken deaktiviert.', 'success');
      } catch {
        addToast('Fehler beim Speichern.', 'error');
      }
    },
    [isSuperuser, addToast]
  );

  return { statisticsEnabled, setStatisticsEnabled };
}
