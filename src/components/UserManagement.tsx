import { useState, memo } from 'react';
import { UserRow } from './UserRow';
import { Spinner } from './shared/Spinner';
import { useGroupContext } from '../context/GroupContext';
import { createUserSchema } from '../lib/validation';
import type { AuthUser } from '../types';
import type { CreateUserInput } from '../lib/validation';

interface UserManagementProps {
  users: AuthUser[];
  currentUser: AuthUser | null;
  isLoading?: boolean;
  onCreate: (data: CreateUserInput, groupId?: string) => Promise<boolean>;
  onChangeGroup: (userId: string, groupId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleAdmin: (id: string, value: boolean) => Promise<void>;
  onUpdateInfo: (id: string, info: string) => Promise<void>;
  onResetPassword: (id: string, name: string) => Promise<void>;
}

export const UserManagement = memo(function UserManagement({
  users,
  currentUser,
  isLoading = false,
  onCreate,
  onChangeGroup,
  onDelete,
  onToggleAdmin,
  onUpdateInfo,
  onResetPassword,
}: UserManagementProps) {
  const { allGroups } = useGroupContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const handleCreate = async () => {
    const result = createUserSchema.safeParse({ name, email, password, is_admin: isAdmin, info });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[String(issue.path[0])] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsCreating(true);
    const ok = await onCreate(result.data, selectedGroupId || undefined);
    if (ok) {
      setName(''); setEmail(''); setPassword(''); setInfo(''); setIsAdmin(false); setSelectedGroupId('');
    }
    setIsCreating(false);
  };

  const filteredUsers = search
    ? users.filter(
        u =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="card">
      <h3 className="card__title">👥 Benutzerverwaltung</h3>

      {/* ── Search ── */}
      <div className="user-search">
        <input
          className="form-input form-input--sm"
          placeholder="Suche nach Name oder E-Mail …"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Benutzer suchen"
        />
        <span className="user-search__count">
          {filteredUsers.length} / {users.length} Nutzer
        </span>
      </div>

      {/* ── Create form ── */}
      {(currentUser?.is_admin || currentUser?.is_superuser) && (
        <div className="user-create-form">
          <h4 className="user-create-form__heading">Neuen Nutzer anlegen</h4>
          <div className="user-create-form__fields">
            <div className="form-group">
              <input
                className={`form-input${errors.name ? ' form-input--error' : ''}`}
                placeholder="Anzeigename"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
                aria-label="Name"
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <input
                className={`form-input${errors.email ? ' form-input--error' : ''}`}
                type="email"
                placeholder="E-Mail-Adresse"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-label="E-Mail"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <input
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                type="password"
                placeholder="Passwort (min. 6 Zeichen)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-label="Passwort"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <input
              className="form-input"
              placeholder="Zusatzinfo (z.B. Büro)"
              value={info}
              onChange={e => setInfo(e.target.value)}
              maxLength={100}
              aria-label="Info"
            />
            {allGroups.length > 0 && (
              <select
                className="form-input"
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                aria-label="Gruppe"
              >
                <option value="">Keine Gruppe</option>
                {allGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            {currentUser?.is_superuser && (
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={isAdmin}
                  onChange={e => setIsAdmin(e.target.checked)}
                />
                <span>Admin-Rechte</span>
              </label>
            )}
            <button
              className="btn btn--success"
              onClick={handleCreate}
              disabled={!name || !email || !password || isCreating}
            >
              {isCreating ? <Spinner size="sm" /> : '+ Nutzer anlegen'}
            </button>
          </div>
        </div>
      )}

      {/* ── Users table ── */}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">E-Mail</th>
                <th scope="col">Gruppe</th>
                <th scope="col">Rolle</th>
                <th scope="col">Info</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="order-summary__empty">
                    {search ? 'Keine Treffer gefunden.' : 'Keine Nutzer vorhanden.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUser={currentUser}
                    allGroups={allGroups}
                    isSelf={u.id === currentUser?.id}
                    onChangeGroup={onChangeGroup}
                    onDelete={onDelete}
                    onToggleAdmin={onToggleAdmin}
                    onUpdateInfo={onUpdateInfo}
                    onResetPassword={onResetPassword}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
