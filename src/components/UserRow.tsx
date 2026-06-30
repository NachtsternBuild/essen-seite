import { useState } from 'react';
import type { AuthUser, Group } from '../types';
import { roleName } from '../lib/utils';
import { userService } from '../services/userService';
import { InputModal } from './shared/InputModal';
import { CustomSelect, type SelectOption } from './shared/CustomSelect';

interface UserRowProps {
  user: AuthUser;
  currentUser: AuthUser | null;
  allGroups: Group[];
  isSelf: boolean;
  onChangeGroup: (userId: string, groupId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleAdmin: (id: string, value: boolean) => Promise<void>;
  onUpdateInfo: (id: string, info: string) => Promise<void>;
  onResetPassword: (id: string, name: string, newPassword: string) => Promise<void>;
}

export function UserRow({
  user,
  currentUser,
  allGroups,
  isSelf,
  onChangeGroup,
  onDelete,
  onToggleAdmin,
  onUpdateInfo,
  onResetPassword,
}: UserRowProps) {
  const isSuperuser = currentUser?.is_superuser ?? false;
  const canDelete = userService.canDelete(user, currentUser);
  const canManage = userService.canManage(user, currentUser);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const roleBadgeClass = user.is_superuser
    ? 'role-badge--super'
    : user.is_admin
    ? 'role-badge--admin'
    : 'role-badge--user';

  const currentGroupName = allGroups.find(g => g.id === user.group_id)?.name;

  return (
    <>
      <tr className={`user-row${isSelf ? ' user-row--self' : ''}`}>
        {/* Name */}
        <td className="user-row__name">
          <div className="user-row__name-inner">
            {user.name}
            {isSelf && <span className="user-row__self-tag">Du</span>}
          </div>
        </td>

        {/* Email */}
        <td className="user-row__email">{user.email}</td>

        {/* Group */}
        <td className="user-row__group">
          {canManage && allGroups.length > 0 ? (
            <CustomSelect
              value={user.group_id ?? ''}
              options={[
                { value: '', label: 'Keine Gruppe' },
                ...allGroups.map((g): SelectOption => ({ value: g.id, label: g.name })),
              ]}
              onChange={groupId => onChangeGroup(user.id, groupId)}
              size="sm"
              ariaLabel={`Gruppe für ${user.name}`}
              className="user-row__group-select"
            />
          ) : (
            <span className="user-row__group-name">{currentGroupName ?? '–'}</span>
          )}
        </td>

        {/* Role */}
        <td className="user-row__role">
          {user.is_superuser ? (
            <span className={`role-badge ${roleBadgeClass}`}>Superuser</span>
          ) : (
            <label className="toggle-label">
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={user.is_admin}
                disabled={!isSuperuser}
                onChange={e => onToggleAdmin(user.id, e.target.checked)}
                aria-label={`Admin-Rechte für ${user.name}`}
              />
              <span className={`role-badge ${roleBadgeClass}`}>
                {roleName(user.is_superuser, user.is_admin)}
              </span>
            </label>
          )}
        </td>

        {/* Info */}
        <td className="user-row__info">
          <div className="user-row__info-inner">
            <span className="user-row__info-text">{user.info || '–'}</span>
            {canManage && (
              <button
                className="btn btn--ghost btn--xs"
                onClick={() => setInfoModalOpen(true)}
                aria-label={`Info für ${user.name} ändern`}
              >
                Ändern
              </button>
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="user-row__actions">
          <div className="user-row__actions-inner">
            {isSuperuser && !user.is_superuser && (
              <button
                className="btn btn--ghost btn--xs"
                onClick={() => setPwModalOpen(true)}
                title="Passwort zurücksetzen"
              >
                Passwort
              </button>
            )}
            {canDelete && (
              <button
                className="btn btn--ghost btn--xs btn--danger-outline"
                onClick={() => onDelete(user.id)}
                title="Nutzer löschen"
                aria-label={`Nutzer ${user.name} löschen`}
              >
                Löschen
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Info edit modal */}
      <InputModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        onConfirm={value => onUpdateInfo(user.id, value)}
        title={`Info für ${user.name}`}
        label="Neue Info (z.B. Büro, Abteilung)"
        defaultValue={user.info ?? ''}
        placeholder="z.B. Büro 2. OG"
        confirmLabel="Speichern"
      />

      {/* Password reset modal */}
      <InputModal
        open={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
        onConfirm={pw => onResetPassword(user.id, user.name, pw)}
        title={`Passwort für ${user.name}`}
        label="Neues Passwort (min. 6 Zeichen)"
        defaultValue=""
        type="password"
        placeholder="Neues Passwort …"
        confirmLabel="Passwort setzen"
      />
    </>
  );
}
