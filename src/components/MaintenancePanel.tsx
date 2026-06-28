import type { MaintenanceSettings } from '../types';

interface MaintenancePanelProps {
  settings: MaintenanceSettings;
  onChange: (next: MaintenanceSettings) => void;
}

export function MaintenancePanel({ settings, onChange }: MaintenancePanelProps) {
  const { active, start_time, duration, message } = settings;

  return (
    <div className="card maintenance-panel">
      <div className="maintenance-panel__header">
        <h3 className="card__title">⚙️ Wartungssteuerung</h3>
        <div className="maintenance-panel__status">
          <span
            className={`status-dot ${active ? 'status-dot--active' : 'status-dot--inactive'}`}
          />
          <span>{active ? 'Aktiv' : 'Inaktiv'}</span>
        </div>
      </div>

      <div className="maintenance-panel__body">
        <div className="form-group">
          <label className="form-label" htmlFor="maint-start">
            Beginn der Wartung
          </label>
          <input
            id="maint-start"
            className="form-input"
            type="datetime-local"
            value={start_time}
            onChange={e =>
              onChange({ ...settings, start_time: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="maint-duration">
            Dauer
          </label>
          <input
            id="maint-duration"
            className="form-input"
            type="text"
            placeholder="z.B. 2 Stunden"
            value={duration}
            onChange={e =>
              onChange({ ...settings, duration: e.target.value })
            }
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="maint-msg">
            Nachricht (optional)
          </label>
          <input
            id="maint-msg"
            className="form-input"
            type="text"
            placeholder="Info für Nutzer …"
            value={message ?? ''}
            onChange={e =>
              onChange({ ...settings, message: e.target.value })
            }
            maxLength={200}
          />
        </div>

        <label className="maintenance-toggle">
          <input
            type="checkbox"
            className="maintenance-toggle__input"
            checked={active}
            onChange={e =>
              onChange({ ...settings, active: e.target.checked })
            }
            aria-label="Wartungsmodus aktivieren"
          />
          <span className="maintenance-toggle__track">
            <span className="maintenance-toggle__thumb" />
          </span>
          <span className="maintenance-toggle__label">
            {active
              ? 'Wartungshinweis aktiv – Nutzer werden informiert'
              : 'Wartungshinweis deaktiviert'}
          </span>
        </label>
      </div>
    </div>
  );
}
