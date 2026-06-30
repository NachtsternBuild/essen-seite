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
    deleteGroup,
  } = useGroups(currentUser);

  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<GroupWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!deletingGroup) return;
    setIsDeleting(true);
    await deleteGroup(deletingGroup.id);
    setIsDeleting(false);
    setDeletingGroup(null);
  };

  const displayGroups: GroupWithStats[] = groupsWithStats.length
    ? groupsWithStats
    : allGroups.map(g => ({ ...g, memberCount: 0, adminNames: [], orderCount: 0 }));

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
        <button
          className="btn btn--success"
          onClick={() => setShowCreate(true)}
        >
          + Neue Gruppe
        </button>
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
              onDelete={() => setDeletingGroup(group)}
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingGroup}
        onClose={() => !isDeleting && setDeletingGroup(null)}
        title="Gruppe löschen"
        size="sm"
        footer={
          <>
            <button
              className="btn btn--ghost"
              onClick={() => setDeletingGroup(null)}
              disabled={isDeleting}
            >
              Abbrechen
            </button>
            <button
              className="btn btn--danger"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
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
                Nutzerkonten bleiben erhalten, werden aber keiner Gruppe mehr zugeordnet.
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
}

function GroupCard({
  group,
  allGroups,
  isLoadingStats,
  onEdit,
  onDelete,
}: GroupCardProps) {
  const linkedGroupName = group.linked_group
    ? allGroups.find(g => g.id === group.linked_group)?.name
    : undefined;

  return (
    <div
      className="group-card"
      style={{ '--group-color': group.color || '#d97706' } as React.CSSProperties}
    >
      <div className="group-card__color-bar" />
      <div className="group-card__body">
        <div className="group-card__header">
          <h4 className="group-card__name">{group.name}</h4>
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
