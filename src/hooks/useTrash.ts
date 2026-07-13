import { useState, useEffect, useCallback } from 'react';
import { trashService } from '../services/trashService';
import { useToastContext } from '../context/ToastContext';
import type { AuthUser, TrashEntry } from '../types';

/**
 * Loads and manages the trash. Superusers see all entries; group admins see
 * only their group's entries (enforced both here and by PocketBase rules).
 */
export function useTrash(currentUser: AuthUser | null, groupId: string | null) {
  const { addToast } = useToastContext();
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isSuperuser = currentUser?.is_superuser ?? false;

  const reload = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const list = isSuperuser
        ? await trashService.list()
        : groupId
          ? await trashService.listForGroup(groupId)
          : [];
      setEntries(list);
    } catch {
      addToast('Fehler beim Laden des Papierkorbs.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isSuperuser, groupId, addToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const restore = useCallback(
    async (id: string) => {
      try {
        await trashService.restore(id, currentUser);
        setEntries(prev => prev.filter(e => e.id !== id));
        addToast('Eintrag wiederhergestellt.', 'success');
      } catch {
        addToast('Wiederherstellung fehlgeschlagen.', 'error');
      }
    },
    [currentUser, addToast]
  );

  const purge = useCallback(
    async (id: string) => {
      try {
        await trashService.purge(id);
        setEntries(prev => prev.filter(e => e.id !== id));
        addToast('Endgültig gelöscht.', 'info');
      } catch {
        addToast('Löschen fehlgeschlagen.', 'error');
      }
    },
    [addToast]
  );

  const empty = useCallback(async () => {
    try {
      await trashService.empty(isSuperuser ? undefined : groupId ?? undefined);
      setEntries([]);
      addToast('Papierkorb geleert.', 'info');
    } catch {
      addToast('Papierkorb konnte nicht geleert werden.', 'error');
    }
  }, [isSuperuser, groupId, addToast]);

  return { entries, isLoading, reload, restore, purge, empty };
}
