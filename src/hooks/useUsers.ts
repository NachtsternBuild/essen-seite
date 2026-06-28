import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { groupService } from '../services/groupService';
import { useToastContext } from '../context/ToastContext';
import type { AuthUser } from '../types';
import type { CreateUserInput } from '../lib/validation';

export function useUsers(currentUser: AuthUser | null) {
  const { addToast } = useToastContext();
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser?.is_admin && !currentUser?.is_superuser) return;
    setIsLoading(true);
    try {
      const users = await userService.getAll();
      setAllUsers(users);
    } catch {
      // non-fatal, just don't update
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.is_admin, currentUser?.is_superuser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createUser = useCallback(
    async (data: CreateUserInput, groupId?: string): Promise<boolean> => {
      if (!currentUser?.is_admin && !currentUser?.is_superuser) {
        addToast('Keine Berechtigung.', 'error');
        return false;
      }
      try {
        const newUser = await userService.create(data);
        if (groupId) {
          try {
            await userService.updateGroupId(newUser.id, groupId);
            if (currentUser?.is_superuser) {
              await groupService.addMember(groupId, newUser.id);
            }
          } catch {
            // non-fatal: user created, group assignment failed
          }
        }
        await refresh();
        addToast(`Nutzer "${data.name}" erfolgreich angelegt.`, 'success');
        return true;
      } catch {
        addToast('Fehler beim Erstellen (E-Mail bereits vergeben?)', 'error');
        return false;
      }
    },
    [currentUser, refresh, addToast]
  );

  const changeGroup = useCallback(
    async (userId: string, groupId: string): Promise<void> => {
      if (!currentUser?.is_admin && !currentUser?.is_superuser) {
        addToast('Keine Berechtigung.', 'error');
        return;
      }
      try {
        await userService.updateGroupId(userId, groupId);
        if (currentUser?.is_superuser && groupId) {
          await groupService.moveMember(userId, groupId);
        }
        await refresh();
        addToast('Gruppe aktualisiert.', 'success');
      } catch {
        addToast('Fehler beim Ändern der Gruppe.', 'error');
      }
    },
    [currentUser, refresh, addToast]
  );

  const deleteUser = useCallback(
    async (id: string): Promise<void> => {
      const user = allUsers.find(u => u.id === id);
      if (!user) return;
      if (!userService.canDelete(user, currentUser)) {
        addToast('Keine Berechtigung zum Löschen.', 'error');
        return;
      }
      if (!window.confirm(`Zugang von "${user.name}" permanent löschen?`)) return;
      try {
        await userService.delete(id);
        await refresh();
        addToast(`Nutzer "${user.name}" gelöscht.`, 'info');
      } catch {
        addToast('Löschen fehlgeschlagen.', 'error');
      }
    },
    [allUsers, currentUser, refresh, addToast]
  );

  const toggleAdmin = useCallback(
    async (id: string, value: boolean): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Rollen ändern.', 'error');
        return;
      }
      try {
        await userService.toggleAdmin(id, value);
        await refresh();
        addToast('Rolle aktualisiert.', 'success');
      } catch {
        addToast('Fehler beim Aktualisieren.', 'error');
      }
    },
    [currentUser, refresh, addToast]
  );

  const updateInfo = useCallback(
    async (id: string, info: string): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Info-Texte ändern.', 'error');
        return;
      }
      try {
        await userService.updateInfo(id, info);
        await refresh();
        addToast('Info aktualisiert.', 'success');
      } catch {
        addToast('Fehler beim Aktualisieren.', 'error');
      }
    },
    [currentUser, refresh, addToast]
  );

  const resetPassword = useCallback(
    async (id: string, name: string): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Passwörter zurücksetzen.', 'error');
        return;
      }
      const newPw = prompt(`Neues Passwort für ${name}:`);
      if (!newPw) return;
      try {
        await userService.resetPassword(id, newPw);
        addToast(`Passwort für ${name} zurückgesetzt.`, 'success');
      } catch {
        addToast('Fehler beim Zurücksetzen.', 'error');
      }
    },
    [currentUser, addToast]
  );

  return {
    allUsers,
    isLoading,
    refresh,
    createUser,
    changeGroup,
    deleteUser,
    toggleAdmin,
    updateInfo,
    resetPassword,
  };
}
