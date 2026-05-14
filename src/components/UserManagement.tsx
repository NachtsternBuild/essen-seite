import { useState } from 'react';
import { UserRow } from './UserRow';
import type { AuthUser } from '../types';

interface UserManagementProps {
  users: AuthUser[];
  currentUser: AuthUser | null;
  onCreate: (data: { name: string; email: string; password: string; is_admin: boolean; info?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleAdmin: (id: string, value: boolean) => Promise<void>;
  onUpdateInfo: (id: string, info: string) => Promise<void>;
  onResetPassword: (id: string, name: string) => void;
}

export function UserManagement({
  users,
  currentUser,
  onCreate,
  onDelete,
  onToggleAdmin,
  onUpdateInfo,
  onResetPassword,
}: UserManagementProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || !email || !password) return;
    setIsCreating(true);
    await onCreate({ name, email, password, is_admin: isAdmin, info });
    setName(''); setEmail(''); setPassword(''); setInfo(''); setIsAdmin(false);
    setIsCreating(false);
  };

  return (
    <div className="card">
      <h3 className="card__title">👥 Benutzerverwaltung</h3>

      {/* ── Create form ── */}
      <div className="user-create-form">
        <h4 className="user-create-form__heading">Neuen Nutzer anlegen</h4>
        <div className="user-create-form__fields">
          <input
            className="form-input"
            placeholder="Anzeigename"
            value={name}
            onChange={e => setName(e.target.value)}
            aria-label="Name"
          />
          <input
            className="form-input"
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-label="E-Mail"
          />
          <input
            className="form-input"
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-label="Passwort"
          />
          <input
            className="form-input"
            placeholder="Zusatzinfo (z.B. Büro)"
            value={info}
            onChange={e => setInfo(e.target.value)}
            aria-label="Info"
          />
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={e => setIsAdmin(e.target.checked)}
            />
            <span>Admin-Rechte</span>
          </label>
          <button
            className="btn btn--success"
            onClick={handleCreate}
            disabled={!name || !email || !password || isCreating}
          >
            {isCreating ? <span className="spinner" /> : '+ Nutzer anlegen'}
          </button>
        </div>
      </div>

      {/* ── Users table ── */}
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Info</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <UserRow
                key={u.id}
                user={u}
                currentUser={currentUser}
                isSelf={u.id === currentUser?.id}
                onDelete={onDelete}
                onToggleAdmin={onToggleAdmin}
                onUpdateInfo={onUpdateInfo}
                onResetPassword={onResetPassword}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
