import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTrash } from '../../hooks/useTrash';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import { Modal } from '../shared/Modal';
import { describeTrashEntry, trashCollectionLabel } from '../../lib/trash';
import type { AuthUser } from '../../types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TrashPanel({
  currentUser,
  groupId,
}: {
  currentUser: AuthUser | null;
  groupId: string | null;
}) {
  const { entries, isLoading, restore, purge, empty } = useTrash(currentUser, groupId);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  if (isLoading) {
    return <div className="card"><Spinner /></div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card__title"><Trash2 size={18} /> Papierkorb</h3>
        {entries.length > 0 && (
          <button className="btn btn--ghost btn--sm btn--danger-outline" onClick={() => setConfirmEmpty(true)}>
            Papierkorb leeren
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={<Trash2 size={48} strokeWidth={1.5} />} message="Der Papierkorb ist leer." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Bezeichnung</th>
                <th>Gelöscht von</th>
                <th>Zeitpunkt</th>
                <th aria-label="Aktionen" />
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td><span className="badge badge--muted">{trashCollectionLabel(e.collection_name)}</span></td>
                  <td>{describeTrashEntry(e)}</td>
                  <td>{e.deleted_by_name}</td>
                  <td>{formatTime(e.created)}</td>
                  <td className="data-table__actions">
                    <button className="btn btn--ghost btn--xs" onClick={() => restore(e.id)}>
                      Wiederherstellen
                    </button>
                    <button className="btn btn--ghost btn--xs btn--danger-outline" onClick={() => purge(e.id)}>
                      Endgültig löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        title="Papierkorb leeren"
        size="sm"
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setConfirmEmpty(false)}>Abbrechen</button>
            <button
              className="btn btn--danger"
              onClick={() => { empty(); setConfirmEmpty(false); }}
            >
              Endgültig leeren
            </button>
          </>
        }
      >
        <p className="confirm-delete__text">
          Alle Einträge im Papierkorb werden <strong>unwiderruflich</strong> gelöscht.
        </p>
      </Modal>
    </div>
  );
}
