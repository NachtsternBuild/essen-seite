import { useState } from 'react';
import { appSettingsSchema } from '../../lib/validation';
import type { AppSettings } from '../../types';
import { Spinner } from '../shared/Spinner';
import { CustomSelect } from '../shared/CustomSelect';
import {
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  CURRENCY_OPTIONS,
  EXPORT_FORMAT_OPTIONS,
} from '../../lib/groupOptions';

const GROUP_COLORS = [
  '#d97706', '#dc2626', '#16a34a', '#2563eb', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#64748b',
];

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
];

interface SystemSettingsFormProps {
  initial: AppSettings;
  onSubmit: (data: AppSettings) => Promise<void>;
  onCancel: () => void;
}

/**
 * Global default settings (Systemeinstellungen). New groups inherit these unless
 * overridden in the group's advanced setup.
 */
export function SystemSettingsForm({ initial, onSubmit, onCancel }: SystemSettingsFormProps) {
  const [color, setColor] = useState(initial.default_color);
  const [language, setLanguage] = useState(initial.default_language);
  const [timezone, setTimezone] = useState(initial.default_timezone);
  const [currency, setCurrency] = useState(initial.default_currency);
  const [deadline, setDeadline] = useState(initial.default_order_deadline);
  const [exportFormat, setExportFormat] = useState<string>(initial.default_export);
  const [theme, setTheme] = useState<string>(initial.default_theme);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const result = appSettingsSchema.safeParse({
      default_color: color,
      default_language: language,
      default_timezone: timezone,
      default_currency: currency,
      default_order_deadline: deadline,
      default_export: exportFormat,
      default_theme: theme,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[issue.path.join('.')] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group-form">
      <p className="form-hint">
        Diese Werte werden bei neuen Gruppen automatisch übernommen. Bestehende
        Gruppen mit eigenen Einstellungen bleiben unverändert.
      </p>

      <div className="form-group">
        <label className="form-label">Standardfarbe</label>
        <div className="color-picker">
          {GROUP_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`color-swatch${color === c ? ' color-swatch--active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Farbe ${c}`}
              aria-pressed={color === c}
            />
          ))}
          <input
            type="color"
            className="color-input"
            value={color}
            onChange={e => setColor(e.target.value)}
            title="Eigene Farbe wählen"
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Standardsprache</label>
          <CustomSelect value={language} options={LANGUAGE_OPTIONS} onChange={setLanguage} ariaLabel="Standardsprache" />
        </div>
        <div className="form-group">
          <label className="form-label">Standardzeitzone</label>
          <CustomSelect value={timezone} options={TIMEZONE_OPTIONS} onChange={setTimezone} ariaLabel="Standardzeitzone" />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Standardwährung</label>
          <CustomSelect value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} ariaLabel="Standardwährung" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ss-deadline">Standard-Bestellschluss</label>
          <input
            id="ss-deadline"
            type="time"
            className={`form-input${errors.default_order_deadline ? ' form-input--error' : ''}`}
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
          {errors.default_order_deadline && (
            <span className="form-error" role="alert">{errors.default_order_deadline}</span>
          )}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Standard-Exportformat</label>
          <CustomSelect value={exportFormat} options={EXPORT_FORMAT_OPTIONS} onChange={setExportFormat} ariaLabel="Standard-Exportformat" />
        </div>
        <div className="form-group">
          <label className="form-label">Standard-Theme</label>
          <CustomSelect value={theme} options={THEME_OPTIONS} onChange={setTheme} ariaLabel="Standard-Theme" />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={isSubmitting}>
          Abbrechen
        </button>
        <button type="button" className="btn btn--success" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" /> : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
