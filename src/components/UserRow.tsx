import type { AuthUser } from '../types';

interface UserRowProps {
  user: AuthUser;
  currentUser: AuthUser | null;
  isSelf: boolean;
  onDelete: (id: string) => void;
  onToggleAdmin: (id: string, value: boolean) => void;
  onUpdateInfo: (id: string, info: string) => void;
  onResetPassword: (id: string, name: string) => void;
}

export function UserRow({
  user,
  currentUser,
  isSelf,
  onDelete,
  onToggleAdmin,
  onUpdateInfo,
  onResetPassword,
}: UserRowProps) {
  const isSuperuser = currentUser?.is_superuser ?? false;
  const canDelete =
    !user.is_superuser &&
    (isSuperuser || (!user.is_admin && currentUser?.is_admin));

  return (
    <tr className={`user-row${isSelf ? ' user-row--self' : ''}`}>
      {/* Name */}
      <td className="user-row__name">
        {user.name}
        {isSelf && <span className="user-row__self-tag">Du</span>}
      </td>

      {/* Email */}
      <td className="user-row__email">{user.email}</td>

      {/* Role toggle */}
      <td className="user-row__role">
        {user.is_superuser ? (
          <span className="role-badge role-badge--super">Superuser</span>
        ) : (
          <label className="toggle-label">
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={user.is_admin}
              disabled={!isSuperuser}
              onChange={e => onToggleAdmin(user.id, e.target.checked)}
            />
            <span className={`role-badge ${user.is_admin ? 'role-badge--admin' : 'role-badge--user'}`}>
              {user.is_admin ? 'Admin' : 'Nutzer'}
            </span>
          </label>
        )}
      </td>

      {/* Info field */}
      <td className="user-row__info">
        <span className="user-row__info-text">{user.info || '–'}</span>
        {isSuperuser && (
          <button
            className="btn btn--ghost btn--xs"
            onClick={() => {
              const newInfo = prompt(`Neue Info für ${user.name}:`, user.info ?? '');
              if (newInfo !== null) onUpdateInfo(user.id, newInfo);
            }}
          >
            Ändern
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="user-row__actions">
        {isSuperuser && !user.is_superuser && (
          <button
            className="btn btn--ghost btn--xs"
            onClick={() => onResetPassword(user.id, user.name)}
            title="Passwort zurücksetzen"
          >
            🔑 Passwort
          </button>
        )}
        {canDelete && (
          <button
            className="btn btn--ghost btn--xs btn--danger-outline"
            onClick={() => onDelete(user.id)}
            title="Nutzer löschen"
          >
            Löschen
          </button>
        )}
      </td>
    </tr>
  );
}
