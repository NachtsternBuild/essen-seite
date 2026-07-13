import { useState, useEffect, useRef, useCallback } from 'react';
import { useGroups } from '../../hooks/useGroups';
import { useToastContext } from '../../context/ToastContext';
import { GroupForm } from './GroupForm';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { Spinner } from '../shared/Spinner';
import { settingsService } from '../../services/settingsService';
import { groupExportSchema } from '../../lib/validation';
import { groupAncestry } from '../../lib/groupOptions';
import type { AppSettings, AuthUser, Group, GroupWithStats } from '../../types';
import type { GroupInput } from '../../lib/validation';

interface GroupManagementProps {
  currentUser: AuthUser | null;
}

export function GroupManagement({ currentUser }: GroupManagementProps) {
  const {
    allGroups,
    groupsWithStats,
    isLoadingGroups,
    isLoadingStats,
    loadStats,
    createGroup,
    updateGroup,
    deleteGroup,
    setArchived,
    cloneGroup,
    exportGroup,
    importGroup,
  } = useGroups(currentUser);
  const { addToast } = useToastContext();

  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<GroupWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    settingsService.getAppSettings().then(setAppSettings).catch(() => {});
  }, []);

  const handleCreate = async (data: GroupInput) => {
    await createGroup(data);
    setShowCreate(false);
  };

  const handleUpdate = async (data: GroupInput) => {
    if (!editingGroup) return;
    await updateGroup(editingGroup.id, data);
    setEditingGroup(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGroup) return;
    setIsDeleting(true);
    await deleteGroup(deletingGroup.id);
    setIsDeleting(false);
    setDeletingGroup(null);
  };


  const handleExport = useCallback(
    async (group: GroupWithStats) => {
      const data = await exportGroup(group.id);
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gruppe-${group.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Gruppe exportiert.', 'success');
    },
    [exportGroup, addToast]
  );

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const result = groupExportSchema.safeParse(parsed);
      if (!result.success) {
        addToast('Ungültige Importdatei.', 'error');
        return;
      }
      await importGroup(result.data);
    } catch {
      addToast('Datei konnte nicht gelesen werden.', 'error');
    }
  };

  const statsGroups: GroupWithStats[] = groupsWithStats.length
    ? groupsWithStats
    : allGroups.map(g => ({ ...g, memberCount: 0, adminNames: [], orderCount: 0 }));

  const visibleGroups = statsGroups.filter(g => showArchived || !g.archived);
  const archivedCount = statsGroups.filter(g => g.archived).length;

  if (isLoadingGroups) {
    return (
      <div className="card">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card__title">🏢 Gruppenverwaltung</h3>
        <div className="card-header__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => fileInputRef.current?.click()}>
            ⬆ Importieren
          </button>
          <button className="btn btn--success" onClick={() => setShowCreate(true)}>
            + Neue Gruppe
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={handleImportFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      {archivedCount > 0 && (
        <label className="group-archive-toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
          />
          Archivierte Gruppen anzeigen ({archivedCount})
        </label>
      )}

      {visibleGroups.length === 0 ? (
        <EmptyState
          icon="🏢"
          message="Noch keine Gruppen vorhanden."
          action={{ label: 'Erste Gruppe anlegen', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="group-grid">
          {visibleGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              allGroups={allGroups}
              isLoadingStats={isLoadingStats}
              onEdit={() => setEditingGroup(group)}
              onDelete={() => setDeletingGroup(group)}
              onClone={() => cloneGroup(group, `${group.name} (Kopie)`)}
              onExport={() => handleExport(group)}
              onArchive={() => setArchived(group.id, !group.archived)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Neue Gruppe erstellen">
        <GroupForm
          allGroups={allGroups}
          isSuperuser={currentUser?.is_superuser}
          appSettings={appSettings ?? undefined}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitLabel="Gruppe erstellen"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingGroup} onClose={() => setEditingGroup(null)} title="Gruppe bearbeiten">
        {editingGroup && (
          <GroupForm
            initial={editingGroup}
            allGroups={allGroups}
            currentGroupId={editingGroup.id}
            isSuperuser={currentUser?.is_superuser}
            appSettings={appSettings ?? undefined}
            onSubmit={handleUpdate}
            onCancel={() => setEditingGroup(null)}
            submitLabel="Änderungen speichern"
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingGroup}
        onClose={() => !isDeleting && setDeletingGroup(null)}
        title="Gruppe löschen"
        size="sm"
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setDeletingGroup(null)} disabled={isDeleting}>
              Abbrechen
            </button>
            <button className="btn btn--danger" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? <Spinner size="sm" /> : 'Endgültig löschen'}
            </button>
          </>
        }
      >
        {deletingGroup && (
          <div className="confirm-delete">
            <p className="confirm-delete__text">
              Soll die Gruppe <strong>{deletingGroup.name}</strong> wirklich gelöscht werden?
            </p>
            <div className="confirm-delete__consequences">
              <p className="confirm-delete__label">Folgendes wird unwiderruflich gelöscht:</p>
              <ul className="confirm-delete__list">
                <li>Alle Wochenpläne der Gruppe</li>
                <li>Alle Bestellungen der Gruppe</li>
                <li>Alle Gruppenmitgliedschaften</li>
              </ul>
              <p className="confirm-delete__note">
                Tipp: Zum Aufbewahren stattdessen <strong>archivieren</strong>. Nutzerkonten
                bleiben erhalten, werden aber keiner Gruppe mehr zugeordnet.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── GroupCard ──────────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: GroupWithStats;
  allGroups: Group[];
  isLoadingStats: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  onExport: () => void;
  onArchive: () => void;
}

function GroupCard({
  group,
  allGroups,
  isLoadingStats,
  onEdit,
  onDelete,
  onClone,
  onExport,
  onArchive,
}: GroupCardProps) {
  const linkedGroupName = group.linked_group
    ? allGroups.find(g => g.id === group.linked_group)?.name
    : undefined;

  const ancestry = groupAncestry(allGroups, group.id);
  const logo = group.settings?.logo;
  const isUrlLogo = logo?.startsWith('http');

  return (
    <div
      className={`group-card${group.archived ? ' group-card--archived' : ''}`}
      style={{ '--group-color': group.color || '#d97706' } as React.CSSProperties}
    >
      <div className="group-card__color-bar" />
      <div className="group-card__body">
        {ancestry.length > 0 && (
          <nav className="group-card__breadcrumb" aria-label="Übergeordnete Gruppen">
            {ancestry.map(a => a.name).join(' › ')} ›
          </nav>
        )}
        <div className="group-card__header">
          <h4 className="group-card__name">
            {logo && (
              isUrlLogo
                ? <img src={logo} alt="" className="group-card__logo" />
                : <span className="group-card__logo-emoji" aria-hidden="true">{logo}</span>
            )}
            {group.name}
          </h4>
          {group.archived && <span className="badge badge--muted">Archiviert</span>}
        </div>

        {group.description && <p className="group-card__desc">{group.description}</p>}

        {linkedGroupName && (
          <p className="group-card__linked">
            Teilt Plan mit: <strong>{linkedGroupName}</strong>
          </p>
        )}

        <div className="group-card__stats">
          {isLoadingStats ? (
            <Spinner size="sm" />
          ) : (
            <>
              <span className="group-stat">
                <strong>{group.memberCount}</strong> Mitglieder
              </span>
              {group.adminNames.length > 0 && (
                <span className="group-stat">Admin: {group.adminNames.join(', ')}</span>
              )}
            </>
          )}
        </div>

        <div className="group-card__actions">
          <button className="btn btn--ghost btn--xs" onClick={onEdit} aria-label="Gruppe bearbeiten">
            Bearbeiten
          </button>
          <button className="btn btn--ghost btn--xs" onClick={onClone} aria-label="Gruppe klonen">
            Klonen
          </button>
          <button className="btn btn--ghost btn--xs" onClick={onExport} aria-label="Gruppe exportieren">
            Export
          </button>
          <button
            className="btn btn--ghost btn--xs"
            onClick={onArchive}
            aria-label={group.archived ? 'Gruppe wiederherstellen' : 'Gruppe archivieren'}
          >
            {group.archived ? 'Wiederherstellen' : 'Archivieren'}
          </button>
          <button
            className="btn btn--ghost btn--xs btn--danger-outline"
            onClick={onDelete}
            aria-label="Gruppe löschen"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
