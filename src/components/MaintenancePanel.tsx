import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import type { MaintenanceSettings } from '../types';

interface MaintenancePanelProps {
  settings: MaintenanceSettings;
  onChange: (next: MaintenanceSettings) => void;
}

export function MaintenancePanel({ settings, onChange }: MaintenancePanelProps) {
  const { active, start_time } = settings;

  // Local state for text fields – only saved on blur, not on every keystroke
  const [localDuration, setLocalDuration] = useState(settings.duration ?? '');
  const [localMessage, setLocalMessage] = useState(settings.message ?? '');

  // Sync when settings load from DB
  useEffect(() => {
    setLocalDuration(settings.duration ?? '');
    setLocalMessage(settings.message ?? '');
  }, [settings.duration, settings.message]);

  const handleDurationBlur = () => {
    let val = localDuration.trim();
    // Auto-append "Stunden" if the value is a plain number
    if (val && /^\d+([.,]\d+)?$/.test(val)) {
      val = val + ' Stunden';
      setLocalDuration(val);
    }
    if (val !== (settings.duration ?? '')) {
      onChange({ ...settings, duration: val });
    }
  };

  const handleMessageBlur = () => {
    const val = localMessage.trim();
    if (val !== (settings.message ?? '')) {
      onChange({ ...settings, message: val });
    }
  };

  return (
    <div className="card maintenance-panel">
      <div className="maintenance-panel__header">
        <h3 className="card__title"><Settings2 size={18} /> Wartungssteuerung</h3>
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
            onChange={e => onChange({ ...settings, start_time: e.target.value })}
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
            value={localDuration}
            onChange={e => setLocalDuration(e.target.value)}
            onBlur={handleDurationBlur}
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
            value={localMessage}
            onChange={e => setLocalMessage(e.target.value)}
            onBlur={handleMessageBlur}
            maxLength={200}
          />
        </div>

        <label className="maintenance-toggle">
          <input
            type="checkbox"
            className="maintenance-toggle__input"
            checked={active}
            onChange={e => {
              if (e.target.checked) {
                onChange({ ...settings, active: true });
              } else {
                onChange({ ...settings, active: false, start_time: '', duration: '', message: '' });
              }
            }}
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
