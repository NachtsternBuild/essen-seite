import { useState, useCallback } from 'react';
import { groupService } from '../services/groupService';
import { auditService } from '../services/auditService';
import { useGroupContext } from '../context/GroupContext';
import { useToastContext } from '../context/ToastContext';
import type { Group, GroupWithStats, AuthUser, GroupExport } from '../types';
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
        void auditService.log({
          user: currentUser,
          action: 'group_create',
          entity_type: 'groups',
          entity_id: group.id,
          group: group.id,
          details: { name: group.name },
        });
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
    async (id: string, data: Partial<GroupInput>): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen bearbeiten.', 'error');
        return;
      }
      try {
        const updated = await groupService.update(id, data);
        void auditService.log({
          user: currentUser,
          action: 'update',
          entity_type: 'groups',
          entity_id: id,
          group: id,
          details: { fields: Object.keys(data) },
        });
        if (activeGroup?.id === id) setActiveGroup(updated);
        await refreshGroups();
        addToast('Gruppe aktualisiert.', 'success');
      } catch {
        addToast('Fehler beim Aktualisieren der Gruppe.', 'error');
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
      try {
        await groupService.deleteWithCascade(id);
        void auditService.log({
          user: currentUser,
          action: 'delete',
          entity_type: 'groups',
          entity_id: id,
        });
        if (activeGroup?.id === id) setActiveGroup(null);
        await refreshGroups();
        addToast('Gruppe und alle zugehörigen Daten gelöscht.', 'info');
      } catch {
        addToast('Fehler beim Löschen der Gruppe.', 'error');
      }
    },
    [currentUser, activeGroup, setActiveGroup, refreshGroups, addToast]
  );

  // ── Lifecycle actions ──────────────────────────────────────────────────────

  const setArchived = useCallback(
    async (id: string, archived: boolean): Promise<void> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen archivieren.', 'error');
        return;
      }
      try {
        const updated = await groupService.setArchived(id, archived);
        if (activeGroup?.id === id) setActiveGroup(archived ? null : updated);
        void auditService.log({
          user: currentUser,
          action: 'update',
          entity_type: 'groups',
          entity_id: id,
          group: id,
          details: { archived },
        });
        await refreshGroups();
        addToast(archived ? 'Gruppe archiviert.' : 'Gruppe wiederhergestellt.', 'success');
      } catch {
        addToast('Fehler beim Archivieren.', 'error');
      }
    },
    [currentUser, activeGroup, setActiveGroup, refreshGroups, addToast]
  );

  const cloneGroup = useCallback(
    async (source: Group, newName: string): Promise<Group | null> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen klonen.', 'error');
        return null;
      }
      try {
        const clone = await groupService.clone(source, newName);
        void auditService.log({
          user: currentUser,
          action: 'create',
          entity_type: 'groups',
          entity_id: clone.id,
          group: clone.id,
          details: { cloned_from: source.id },
        });
        await refreshGroups();
        addToast(`Gruppe "${clone.name}" als Kopie erstellt.`, 'success');
        return clone;
      } catch {
        addToast('Fehler beim Klonen der Gruppe.', 'error');
        return null;
      }
    },
    [currentUser, refreshGroups, addToast]
  );

  const exportGroup = useCallback(
    async (id: string): Promise<GroupExport | null> => {
      try {
        const data = await groupService.exportGroup(id);
        void auditService.log({
          user: currentUser,
          action: 'export',
          entity_type: 'groups',
          entity_id: id,
          group: id,
        });
        return data;
      } catch {
        addToast('Fehler beim Exportieren der Gruppe.', 'error');
        return null;
      }
    },
    [currentUser, addToast]
  );

  const importGroup = useCallback(
    async (data: GroupExport, nameOverride?: string): Promise<Group | null> => {
      if (!currentUser?.is_superuser) {
        addToast('Nur Superuser dürfen Gruppen importieren.', 'error');
        return null;
      }
      try {
        const group = await groupService.importGroup(data, nameOverride);
        void auditService.log({
          user: currentUser,
          action: 'import',
          entity_type: 'groups',
          entity_id: group.id,
          group: group.id,
          details: { plans: data.meal_plans?.length ?? 0 },
        });
        await refreshGroups();
        addToast(`Gruppe "${group.name}" importiert.`, 'success');
        return group;
      } catch {
        addToast('Fehler beim Importieren der Gruppe.', 'error');
        return null;
      }
    },
    [currentUser, refreshGroups, addToast]
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
    deleteGroup,
    setArchived,
    cloneGroup,
    exportGroup,
    importGroup,
    addMember,
    removeMember,
  };
}
