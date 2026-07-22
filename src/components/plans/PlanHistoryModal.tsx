import type { ReactNode } from 'react';
import { History, Sparkles, Plus, Minus, Pencil, RefreshCw, Circle } from 'lucide-react';
import { usePlanHistory } from '../../hooks/usePlanHistory';
import { Modal } from '../shared/Modal';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import type { PlanHistoryAction } from '../../types';

const ACTION_ICON: Record<PlanHistoryAction, ReactNode> = {
  created: <Sparkles size={15} />,
  meal_added: <Plus size={15} />,
  meal_removed: <Minus size={15} />,
  meals_updated: <Pencil size={15} />,
  status_changed: <RefreshCw size={15} />,
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
    <Modal open={open} onClose={onClose} title={<><History size={19} /> Planhistorie</>}>
      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState icon={<History size={48} strokeWidth={1.5} />} message="Noch keine Änderungen erfasst." />
      ) : (
        <ul className="history-list">
          {entries.map(e => (
            <li key={e.id} className="history-item">
              <span className="history-item__icon" aria-hidden="true">
                {ACTION_ICON[e.action] ?? <Circle size={8} fill="currentColor" />}
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
