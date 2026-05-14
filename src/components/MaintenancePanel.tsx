interface MaintenancePanelProps {
  active: boolean;
  start: string;
  duration: string;
  onChange: (active: boolean, start?: string, duration?: string) => void;
}

export function MaintenancePanel({ active, start, duration, onChange }: MaintenancePanelProps) {
  return (
    <div className="card maintenance-panel">
      <div className="maintenance-panel__header">
        <h3 className="card__title">⚙️ Wartungssteuerung</h3>
        <div className="maintenance-panel__status">
          <span className={`status-dot ${active ? 'status-dot--active' : 'status-dot--inactive'}`} />
          <span>{active ? 'Aktiv' : 'Inaktiv'}</span>
        </div>
      </div>

      <div className="maintenance-panel__body">
        <div className="form-group">
          <label className="form-label">Beginn der Wartung</label>
          <input
            className="form-input"
            type="datetime-local"
            value={start}
            onChange={e => onChange(active, e.target.value, undefined)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Dauer (z.B. "2 Std")</label>
          <input
            className="form-input"
            type="text"
            placeholder="z.B. 2 Stunden"
            value={duration}
            onChange={e => onChange(active, undefined, e.target.value)}
          />
        </div>

        {/* Toggle switch */}
        <label className="maintenance-toggle">
          <input
            type="checkbox"
            className="maintenance-toggle__input"
            checked={active}
            onChange={e => onChange(e.target.checked, undefined, undefined)}
          />
          <span className="maintenance-toggle__track">
            <span className="maintenance-toggle__thumb" />
          </span>
          <span className="maintenance-toggle__label">
            {active ? 'Wartungshinweis aktiv – Nutzer werden informiert' : 'Wartungshinweis deaktiviert'}
          </span>
        </label>
      </div>
    </div>
  );
}
