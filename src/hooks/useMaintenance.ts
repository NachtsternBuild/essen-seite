import { useState, useEffect, useCallback, useMemo } from 'react';
import { maintenanceService } from '../services/maintenanceService';
import { useToastContext } from '../context/ToastContext';
import type { MaintenanceSettings, MaintenanceInfo } from '../types';

export function useMaintenance(isSuperuser: boolean) {
  const { addToast } = useToastContext();
  const [settings, setSettings] = useState<MaintenanceSettings>({
    active: false,
    start_time: '',
    duration: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const s = await maintenanceService.get();
      setSettings(s);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (next: MaintenanceSettings): Promise<void> => {
      if (!isSuperuser) {
        addToast('Nur Superuser dürfen Wartungseinstellungen ändern.', 'error');
        return;
      }
      try {
        await maintenanceService.set(next);
        setSettings(next);
        addToast('Wartungseinstellungen gespeichert.', 'success');
      } catch {
        addToast('Fehler beim Speichern.', 'error');
      }
    },
    [isSuperuser, addToast]
  );

  const maintenanceInfo = useMemo((): MaintenanceInfo | null => {
    return maintenanceService.computeInfo(settings);
  }, [settings]);

  return { settings, maintenanceInfo, isLoading, refresh, update };
}
