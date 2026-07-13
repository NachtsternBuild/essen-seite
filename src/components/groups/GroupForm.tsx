import { useState } from 'react';
import { groupSchema } from '../../lib/validation';
import type { AppSettings, Group } from '../../types';
import type { GroupInput } from '../../lib/validation';
import { Spinner } from '../shared/Spinner';
import { CustomSelect, type SelectOption } from '../shared/CustomSelect';
import {
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  CURRENCY_OPTIONS,
  EXPORT_FORMAT_OPTIONS,
  wouldCreateCycle,
} from '../../lib/groupOptions';
import { DEFAULT_APP_SETTINGS } from '../../services/settingsService';

const GROUP_COLORS = [
  '#d97706', '#dc2626', '#16a34a', '#2563eb', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#64748b',
];

type FormMode = 'standard' | 'advanced';

interface GroupFormProps {
  initial?: Partial<Group>;
  allGroups?: Group[];
  currentGroupId?: string;
  isSuperuser?: boolean;
  /** Global defaults used to prefill the advanced form / show inherited values. */
  appSettings?: AppSettings;
  onSubmit: (data: GroupInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function GroupForm({
  initial,
  allGroups = [],
  currentGroupId,
  isSuperuser = false,
  appSettings = DEFAULT_APP_SETTINGS,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
}: GroupFormProps) {
  const hasOverrides =
    !!initial?.parent_group ||
    !!(initial?.settings && Object.keys(initial.settings).length > 0);

  const [mode, setMode] = useState<FormMode>(hasOverrides ? 'advanced' : 'standard');

  // ── Standard fields ──
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? appSettings.default_color);
  const [linkedGroup, setLinkedGroup] = useState(initial?.linked_group ?? '');

  // ── Advanced fields (settings + hierarchy) ──
  const s = initial?.settings ?? {};
  const [parentGroup, setParentGroup] = useState(initial?.parent_group ?? '');
  const [logo, setLogo] = useState(s.logo ?? '');
  const [language, setLanguage] = useState(s.language ?? appSettings.default_language);
  const [timezone, setTimezone] = useState(s.timezone ?? appSettings.default_timezone);
  const [currency, setCurrency] = useState(s.currency ?? appSettings.default_currency);
  const [orderDeadline, setOrderDeadline] = useState(
    s.order_deadline ?? appSettings.default_order_deadline
  );
  const [defaultExport, setDefaultExport] = useState<string>(
    s.default_export ?? appSettings.default_export
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // In standard mode, settings stay undefined so the group inherits global
    // defaults; advanced mode writes explicit overrides.
    const payload = {
      name,
      description,
      color,
      linked_group: linkedGroup || null,
      parent_group: mode === 'advanced' ? parentGroup || null : (initial?.parent_group ?? null),
      settings:
        mode === 'advanced'
          ? {
              logo: logo || undefined,
              language,
              timezone,
              currency,
              order_deadline: orderDeadline,
              default_export: defaultExport as 'txt' | 'csv' | 'pdf' | 'json',
            }
          : undefined,
    };

    const result = groupSchema.safeParse(payload);
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

  // Only groups with their own plan (no linked_group) can be a link target.
  const linkableGroups = allGroups.filter(g => g.id !== currentGroupId && !g.linked_group);

  // Parent candidates: any other group that would not create a cycle.
  const parentCandidates = allGroups.filter(
    g => g.id !== currentGroupId && !wouldCreateCycle(allGroups, currentGroupId ?? '', g.id)
  );

  return (
    <div className="group-form">
      {/* Mode switch */}
      <div className="form-mode-switch" role="tablist" aria-label="Einrichtungsmodus">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'standard'}
          className={`form-mode-switch__btn${mode === 'standard' ? ' form-mode-switch__btn--active' : ''}`}
          onClick={() => setMode('standard')}
        >
          Standard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'advanced'}
          className={`form-mode-switch__btn${mode === 'advanced' ? ' form-mode-switch__btn--active' : ''}`}
          onClick={() => setMode('advanced')}
        >
          Erweiterte Einrichtung
        </button>
      </div>

      {mode === 'standard' && (
        <p className="form-hint">
          Im Standardmodus werden alle weiteren Einstellungen (Sprache, Zeitzone,
          Bestellschluss …) automatisch aus den Systemeinstellungen übernommen.
        </p>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="gf-name">
          Gruppenname *
        </label>
        <input
          id="gf-name"
          className={`form-input${errors.name ? ' form-input--error' : ''}`}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z.B. Kantine Nordflügel"
          maxLength={60}
          aria-required="true"
          aria-describedby={errors.name ? 'gf-name-err' : undefined}
        />
        {errors.name && (
          <span id="gf-name-err" className="form-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="gf-desc">
          Beschreibung
        </label>
        <textarea
          id="gf-desc"
          className="form-input form-textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Kurze Beschreibung der Gruppe"
          maxLength={200}
          rows={2}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Gruppenfarbe</label>
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
        {errors.color && (
          <span className="form-error" role="alert">
            {errors.color}
          </span>
        )}
      </div>

      {/* ── Advanced section ── */}
      {mode === 'advanced' && (
        <>
          <div className="form-section-label">Darstellung & Regionales</div>

          <div className="form-group">
            <label className="form-label" htmlFor="gf-logo">
              Logo (Emoji oder Bild-URL)
            </label>
            <input
              id="gf-logo"
              className="form-input"
              value={logo}
              onChange={e => setLogo(e.target.value)}
              placeholder="🍽 oder https://…/logo.png"
              maxLength={200}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Sprache</label>
              <CustomSelect
                value={language}
                options={LANGUAGE_OPTIONS}
                onChange={setLanguage}
                ariaLabel="Sprache auswählen"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Zeitzone</label>
              <CustomSelect
                value={timezone}
                options={TIMEZONE_OPTIONS}
                onChange={setTimezone}
                ariaLabel="Zeitzone auswählen"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Währung</label>
              <CustomSelect
                value={currency}
                options={CURRENCY_OPTIONS}
                onChange={setCurrency}
                ariaLabel="Währung auswählen"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gf-deadline">
                Bestellschluss
              </label>
              <input
                id="gf-deadline"
                type="time"
                className={`form-input${errors['settings.order_deadline'] ? ' form-input--error' : ''}`}
                value={orderDeadline}
                onChange={e => setOrderDeadline(e.target.value)}
              />
              {errors['settings.order_deadline'] && (
                <span className="form-error" role="alert">
                  {errors['settings.order_deadline']}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Standard-Exportformat</label>
            <CustomSelect
              value={defaultExport}
              options={EXPORT_FORMAT_OPTIONS}
              onChange={setDefaultExport}
              ariaLabel="Standard-Exportformat auswählen"
            />
          </div>

          {isSuperuser && (
            <>
              <div className="form-section-label">Hierarchie</div>
              <div className="form-group">
                <label className="form-label">Übergeordnete Gruppe</label>
                {parentCandidates.length === 0 ? (
                  <p className="form-hint">Keine übergeordnete Gruppe verfügbar.</p>
                ) : (
                  <CustomSelect
                    value={parentGroup}
                    options={[
                      { value: '', label: 'Keine (oberste Ebene)' },
                      ...parentCandidates.map((g): SelectOption => ({ value: g.id, label: g.name })),
                    ]}
                    onChange={setParentGroup}
                    ariaLabel="Übergeordnete Gruppe auswählen"
                  />
                )}
                <span className="form-hint">
                  Ordnet diese Gruppe einer übergeordneten Gruppe unter (z.B. Werk → Abteilung).
                </span>
              </div>
            </>
          )}
        </>
      )}

      {isSuperuser && (
        <div className="form-group">
          <label className="form-label" htmlFor="gf-linked">
            Plan teilen mit Gruppe
          </label>
          {linkableGroups.length === 0 ? (
            <p className="form-hint">
              Keine verfügbaren Gruppen – nur Gruppen mit eigenem Plan können als Quelle gewählt werden.
            </p>
          ) : (
            <>
              <CustomSelect
                value={linkedGroup}
                options={[
                  { value: '', label: 'Kein geteilter Plan' },
                  ...linkableGroups.map((g): SelectOption => ({ value: g.id, label: g.name })),
                ]}
                onChange={setLinkedGroup}
                ariaLabel="Gruppe für geteilten Plan auswählen"
              />
              <span className="form-hint">
                Diese Gruppe verwendet dann den Speiseplan der ausgewählten Gruppe.
                Nur Gruppen ohne eigene Verknüpfung sind wählbar (keine Kettenverlinkung).
              </span>
            </>
          )}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Abbrechen
        </button>
        <button
          type="button"
          className="btn btn--success"
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? <Spinner size="sm" /> : submitLabel}
        </button>
      </div>
    </div>
  );
}
