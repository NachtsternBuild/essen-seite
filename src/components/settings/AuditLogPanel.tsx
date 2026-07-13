import { useAuditLog } from '../../hooks/useAuditLog';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import type { AuditAction } from '../../types';

const ACTION_LABEL: Record<AuditAction, string> = {
  login: 'Anmeldung',
  logout: 'Abmeldung',
  create: 'Erstellt',
  update: 'Geändert',
  delete: 'Gelöscht',
  restore: 'Wiederhergestellt',
  import: 'Importiert',
  export: 'Exportiert',
  permission_change: 'Rechte geändert',
  group_create: 'Gruppe erstellt',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AuditLogPanel({ enabled }: { enabled: boolean }) {
  const { entries, isLoading } = useAuditLog(enabled);

  if (!enabled) {
    return <EmptyState icon="🔒" message="Keine Berechtigung zum Einsehen des Protokolls." />;
  }
  if (isLoading) return <Spinner />;
  if (entries.length === 0) {
    return <EmptyState icon="📋" message="Noch keine Protokolleinträge." />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Zeitpunkt</th>
            <th>Benutzer</th>
            <th>Aktion</th>
            <th>Objekt</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td>{formatTime(e.created)}</td>
              <td>{e.user_name}</td>
              <td><span className="badge badge--muted">{ACTION_LABEL[e.action] ?? e.action}</span></td>
              <td>{e.entity_type || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
