import { useState, useCallback } from 'react';
import { groupService } from '../services/groupService';
import { useGroupContext } from '../context/GroupContext';
import { useToastContext } from '../context/ToastContext';
import type { Group, GroupWithStats, AuthUser } from '../types';
import type { GroupInput } from '../lib/validation';

export function useGroups(currentUser: AuthUser | null) {
  const { addToast } = useToastContext();
  const { activeGroup, allGroups, isLoadingGroups, setActiveGroup, refreshGroups } =
    useGroupContext();
  const [groupsWithStats, setGroupsWithStats] = useState<GroupWithStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const loadStats = useCallback(async () => {
    if (!currentUser?.is_superuser) return;
    setIsLoadingStats(true);
    try {
      const stats = await groupService.getGroupsWithStats(allGroups);
      setGroupsWithStats(stats);
    } catch {
      // non-fatal
    } finally {
      setIsLoadingStats(false);
    }
  }, [currentUser?.is_superuser, allGroups]);

  const createGroup = useCallback(
    async (data: GroupInput): Promise<Group | null> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen erstellen.', 'error');
        return null;
      }
      try {
        const group = await groupService.create(data);
        await refreshGroups();
        addToast(`Gruppe "${group.name}" erstellt.`, 'success');
        return group;
      } catch {
        addToast('Fehler beim Erstellen der Gruppe.', 'error');
        return null;
      }
    },
    [currentUser, refreshGroups, addToast]
  );

  const updateGroup = useCallback(
    async (id: string, data: Partial<GroupInput & { archived: boolean }>): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen bearbeiten.', 'error');
        return;
      }
      try {
        const updated = await groupService.update(id, data);
        if (activeGroup?.id === id) setActiveGroup(updated);
        await refreshGroups();
        addToast('Gruppe aktualisiert.', 'success');
      } catch {
        addToast('Fehler beim Aktualisieren der Gruppe.', 'error');
      }
    },
    [currentUser, activeGroup, setActiveGroup, refreshGroups, addToast]
  );

  const archiveGroup = useCallback(
    async (id: string): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen archivieren.', 'error');
        return;
      }
      if (!window.confirm('Gruppe wirklich archivieren?')) return;
      try {
        await groupService.archive(id);
        if (activeGroup?.id === id) setActiveGroup(null);
        await refreshGroups();
        addToast('Gruppe archiviert.', 'info');
      } catch {
        addToast('Fehler beim Archivieren.', 'error');
      }
    },
    [currentUser, activeGroup, setActiveGroup, refreshGroups, addToast]
  );

  const deleteGroup = useCallback(
    async (id: string): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen löschen.', 'error');
        return;
      }
      if (
        !window.confirm(
          'Gruppe permanent löschen? Alle Daten (Pläne, Bestellungen) werden unwiderruflich gelöscht!'
        )
      )
        return;
      try {
        await groupService.delete(id);
        if (activeGroup?.id === id) setActiveGroup(null);
        await refreshGroups();
        addToast('Gruppe gelöscht.', 'info');
      } catch {
        addToast('Fehler beim Löschen der Gruppe.', 'error');
      }
    },
    [currentUser, activeGroup, setActiveGroup, refreshGroups, addToast]
  );

  const addMember = useCallback(
    async (groupId: string, userId: string, role: 'admin' | 'member' = 'member') => {
      try {
        await groupService.addMember(groupId, userId, role);
        addToast('Mitglied hinzugefügt.', 'success');
      } catch {
        addToast('Fehler beim Hinzufügen.', 'error');
      }
    },
    [addToast]
  );

  const removeMember = useCallback(
    async (membershipId: string) => {
      try {
        await groupService.removeMember(membershipId);
        addToast('Mitglied entfernt.', 'info');
      } catch {
        addToast('Fehler beim Entfernen.', 'error');
      }
    },
    [addToast]
  );

  return {
    activeGroup,
    allGroups,
    groupsWithStats,
    isLoadingGroups,
    isLoadingStats,
    setActiveGroup,
    refreshGroups,
    loadStats,
    createGroup,
    updateGroup,
    archiveGroup,
    deleteGroup,
    addMember,
    removeMember,
  };
}
