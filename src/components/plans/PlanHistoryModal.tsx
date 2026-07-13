import { usePlanHistory } from '../../hooks/usePlanHistory';
import { Modal } from '../shared/Modal';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import type { PlanHistoryAction } from '../../types';

const ACTION_ICON: Record<PlanHistoryAction, string> = {
  created: '🆕',
  meal_added: '➕',
  meal_removed: '➖',
  meals_updated: '✏️',
  status_changed: '🔄',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface PlanHistoryModalProps {
  planId: string | null;
  open: boolean;
  onClose: () => void;
}

/** Read-only timeline of who changed a plan, when and what (brief §11). */
export function PlanHistoryModal({ planId, open, onClose }: PlanHistoryModalProps) {
  const { entries, isLoading } = usePlanHistory(open ? planId : null);

  return (
    <Modal open={open} onClose={onClose} title="🕓 Planhistorie">
      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState icon="🕓" message="Noch keine Änderungen erfasst." />
      ) : (
        <ul className="history-list">
          {entries.map(e => (
            <li key={e.id} className="history-item">
              <span className="history-item__icon" aria-hidden="true">
                {ACTION_ICON[e.action] ?? '•'}
              </span>
              <div className="history-item__body">
                <div className="history-item__summary">{e.summary}</div>
                <div className="history-item__meta">
                  {e.user_name} · {formatTime(e.created)}
                  {e.day && ` · ${e.day}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
