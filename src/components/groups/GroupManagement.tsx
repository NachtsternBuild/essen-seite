import { useState, useEffect } from 'react';
import { useGroups } from '../../hooks/useGroups';
import { GroupForm } from './GroupForm';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { Spinner } from '../shared/Spinner';
import type { AuthUser, Group, GroupWithStats } from '../../types';
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
    archiveGroup,
    deleteGroup,
  } = useGroups(currentUser);

  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleCreate = async (data: GroupInput) => {
    await createGroup(data);
    setShowCreate(false);
  };

  const handleUpdate = async (data: GroupInput) => {
    if (!editingGroup) return;
    await updateGroup(editingGroup.id, data);
    setEditingGroup(null);
  };

  const displayGroups: GroupWithStats[] = groupsWithStats.length
    ? groupsWithStats.filter(g => showArchived || !g.archived)
    : allGroups
        .filter(g => showArchived || !g.archived)
        .map(g => ({ ...g, memberCount: 0, adminNames: [], orderCount: 0 }));

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
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
            />
            <span>Archivierte anzeigen</span>
          </label>
          <button
            className="btn btn--success btn--sm"
            onClick={() => setShowCreate(true)}
          >
            + Neue Gruppe
          </button>
        </div>
      </div>

      {displayGroups.length === 0 ? (
        <EmptyState
          icon="🏢"
          message="Noch keine Gruppen vorhanden."
          action={{ label: 'Erste Gruppe anlegen', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="group-grid">
          {displayGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              allGroups={allGroups}
              isLoadingStats={isLoadingStats}
              onEdit={() => setEditingGroup(group)}
              onArchive={() => archiveGroup(group.id)}
              onDelete={() => deleteGroup(group.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Neue Gruppe erstellen"
      >
        <GroupForm
          allGroups={allGroups}
          isSuperuser={currentUser?.is_superuser}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitLabel="Gruppe erstellen"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        title="Gruppe bearbeiten"
      >
        {editingGroup && (
          <GroupForm
            initial={editingGroup}
            allGroups={allGroups}
            currentGroupId={editingGroup.id}
            isSuperuser={currentUser?.is_superuser}
            onSubmit={handleUpdate}
            onCancel={() => setEditingGroup(null)}
            submitLabel="Änderungen speichern"
          />
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
  onArchive: () => void;
  onDelete: () => void;
}

function GroupCard({
  group,
  allGroups,
  isLoadingStats,
  onEdit,
  onArchive,
  onDelete,
}: GroupCardProps) {
  const linkedGroupName = group.linked_group
    ? allGroups.find(g => g.id === group.linked_group)?.name
    : undefined;

  return (
    <div
      className={`group-card${group.archived ? ' group-card--archived' : ''}`}
      style={{ '--group-color': group.color || '#d97706' } as React.CSSProperties}
    >
      <div className="group-card__color-bar" />
      <div className="group-card__body">
        <div className="group-card__header">
          <h4 className="group-card__name">{group.name}</h4>
          {group.archived && (
            <span className="badge badge--muted">Archiviert</span>
          )}
        </div>

        {group.description && (
          <p className="group-card__desc">{group.description}</p>
        )}

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
                <span className="group-stat">
                  Admin: {group.adminNames.join(', ')}
                </span>
              )}
            </>
          )}
        </div>

        <div className="group-card__actions">
          <button
            className="btn btn--ghost btn--xs"
            onClick={onEdit}
            aria-label="Gruppe bearbeiten"
          >
            Bearbeiten
          </button>
          {!group.archived ? (
            <button
              className="btn btn--ghost btn--xs"
              onClick={onArchive}
              aria-label="Gruppe archivieren"
            >
              Archivieren
            </button>
          ) : (
            <button
              className="btn btn--ghost btn--xs btn--danger-outline"
              onClick={onDelete}
              aria-label="Gruppe löschen"
            >
              Löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
