import { useState, memo } from 'react';
import { UserRow } from './UserRow';
import { Spinner } from './shared/Spinner';
import { Modal } from './shared/Modal';
import { CustomSelect, type SelectOption } from './shared/CustomSelect';
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
  onResetPassword: (id: string, name: string, newPassword: string) => Promise<void>;
}

const EMPTY_FORM = { name: '', email: '', password: '', info: '', isAdmin: false, groupId: '' };

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const canCreate = currentUser?.is_admin || currentUser?.is_superuser;

  const openDialog = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setErrors({});
  };

  const set = (field: keyof typeof EMPTY_FORM) =>
    (value: string | boolean) =>
      setForm(f => ({ ...f, [field]: value }));

  const handleCreate = async () => {
    const result = createUserSchema.safeParse({
      name: form.name,
      email: form.email,
      password: form.password,
      is_admin: form.isAdmin,
      info: form.info,
    });
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
    const ok = await onCreate(result.data, form.groupId || undefined);
    setIsCreating(false);
    if (ok) closeDialog();
  };

  const filteredUsers = search
    ? users.filter(
        u =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const groupOptions: SelectOption[] = [
    { value: '', label: 'Keine Gruppe' },
    ...allGroups.map(g => ({ value: g.id, label: g.name })),
  ];

  return (
    <>
      <div className="card">
        {/* ── Card header ── */}
        <div className="user-mgmt__header">
          <h3 className="card__title">👥 Benutzerverwaltung</h3>
          {canCreate && (
            <button className="btn btn--success" onClick={openDialog}>
              + Nutzer anlegen
            </button>
          )}
        </div>

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

      {/* ── Create user dialog ── */}
      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title="Neuen Nutzer anlegen"
        size="sm"
        footer={
          <>
            <button className="btn btn--ghost" onClick={closeDialog} disabled={isCreating}>
              Abbrechen
            </button>
            <button
              className="btn btn--success"
              onClick={handleCreate}
              disabled={!form.name || !form.email || !form.password || isCreating}
            >
              {isCreating ? <Spinner size="sm" /> : '+ Nutzer anlegen'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label" htmlFor="new-user-name">Name</label>
          <input
            id="new-user-name"
            className={`form-input${errors.name ? ' form-input--error' : ''}`}
            placeholder="Anzeigename"
            value={form.name}
            onChange={e => set('name')(e.target.value)}
            maxLength={50}
            autoComplete="off"
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label" htmlFor="new-user-email">E-Mail</label>
          <input
            id="new-user-email"
            className={`form-input${errors.email ? ' form-input--error' : ''}`}
            type="email"
            placeholder="E-Mail-Adresse"
            value={form.email}
            onChange={e => set('email')(e.target.value)}
            autoComplete="off"
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label" htmlFor="new-user-pw">Passwort</label>
          <input
            id="new-user-pw"
            className={`form-input${errors.password ? ' form-input--error' : ''}`}
            type="password"
            placeholder="Mindestens 6 Zeichen"
            value={form.password}
            onChange={e => set('password')(e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label" htmlFor="new-user-info">Info (optional)</label>
          <input
            id="new-user-info"
            className="form-input"
            placeholder="z.B. Büro, Abteilung"
            value={form.info}
            onChange={e => set('info')(e.target.value)}
            maxLength={100}
          />
        </div>

        {allGroups.length > 0 && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Gruppe</label>
            <CustomSelect
              value={form.groupId}
              options={groupOptions}
              onChange={v => set('groupId')(v)}
              ariaLabel="Gruppe auswählen"
            />
          </div>
        )}

        {currentUser?.is_superuser && (
          <label className="toggle-label" style={{ marginTop: 16 }}>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={form.isAdmin}
              onChange={e => set('isAdmin')(e.target.checked)}
            />
            <span>Admin-Rechte</span>
          </label>
        )}
      </Modal>
    </>
  );
});
