import type { AuthUser, Group } from '../types';
import { roleName } from '../lib/utils';
import { userService } from '../services/userService';

interface UserRowProps {
  user: AuthUser;
  currentUser: AuthUser | null;
  allGroups: Group[];
  isSelf: boolean;
  onChangeGroup: (userId: string, groupId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleAdmin: (id: string, value: boolean) => Promise<void>;
  onUpdateInfo: (id: string, info: string) => Promise<void>;
  onResetPassword: (id: string, name: string) => Promise<void>;
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

  const roleBadgeClass = user.is_superuser
    ? 'role-badge--super'
    : user.is_admin
    ? 'role-badge--admin'
    : 'role-badge--user';

  const currentGroupName = allGroups.find(g => g.id === user.group_id)?.name;

  return (
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
          <select
            className="form-input form-input--sm user-row__group-select"
            value={user.group_id ?? ''}
            onChange={e => onChangeGroup(user.id, e.target.value)}
            aria-label={`Gruppe für ${user.name}`}
          >
            <option value="">Keine Gruppe</option>
            {allGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
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
              onClick={() => {
                const newInfo = prompt(
                  `Neue Info für ${user.name}:`,
                  user.info ?? ''
                );
                if (newInfo !== null) onUpdateInfo(user.id, newInfo);
              }}
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
              onClick={() => onResetPassword(user.id, user.name)}
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
  );
}
