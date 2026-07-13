import { Modal } from '../shared/Modal';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import type { SharedPlan, SyncMode } from '../../types';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  templates: SharedPlan[];
  isLoading: boolean;
  /** True when a plan for the target week already exists (adopt = replace). */
  willReplace: boolean;
  onAdopt: (template: SharedPlan, mode: SyncMode) => void;
}

/** Picker to adopt a published plan template as a copy or synced plan (§9/§10). */
export function TemplateModal({
  open,
  onClose,
  templates,
  isLoading,
  willReplace,
  onAdopt,
}: TemplateModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="📋 Plan aus Vorlage übernehmen">
      {isLoading ? (
        <Spinner />
      ) : templates.length === 0 ? (
        <EmptyState
          icon="📋"
          message={'Noch keine Vorlagen vorhanden. Veröffentliche einen Plan über „Als Vorlage".'}
        />
      ) : (
        <>
          {willReplace && (
            <div className="info-banner" role="note">
              Der aktuelle Plan dieser Woche wird durch die gewählte Vorlage <strong>ersetzt</strong>.
            </div>
          )}
          <ul className="template-list">
            {templates.map(t => (
              <li key={t.id} className="template-item">
                <div className="template-item__info">
                  <div className="template-item__name">{t.name}</div>
                  <div className="template-item__meta">
                    von {t.source_group_name}
                    {t.week_label ? ` · ${t.week_label}` : ''}
                  </div>
                  {t.description && <div className="template-item__desc">{t.description}</div>}
                </div>
                <div className="template-item__actions">
                  <button className="btn btn--primary btn--sm" onClick={() => onAdopt(t, 'copy')}>
                    Als Kopie
                  </button>
                  {!willReplace && (
                    <button className="btn btn--ghost btn--sm" onClick={() => onAdopt(t, 'sync')}>
                      Synchronisiert
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
