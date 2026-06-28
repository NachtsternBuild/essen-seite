import { useState } from 'react';
import { groupSchema } from '../../lib/validation';
import type { Group } from '../../types';
import type { GroupInput } from '../../lib/validation';
import { Spinner } from '../shared/Spinner';

const GROUP_COLORS = [
  '#d97706', '#dc2626', '#16a34a', '#2563eb', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#64748b',
];

interface GroupFormProps {
  initial?: Partial<Group>;
  allGroups?: Group[];
  currentGroupId?: string;
  isSuperuser?: boolean;
  onSubmit: (data: GroupInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function GroupForm({
  initial,
  allGroups = [],
  currentGroupId,
  isSuperuser = false,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
}: GroupFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? '#d97706');
  const [linkedGroup, setLinkedGroup] = useState(initial?.linked_group ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const result = groupSchema.safeParse({
      name,
      description,
      color,
      linked_group: linkedGroup || null,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[issue.path[0] as string] = issue.message;
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

  const otherGroups = allGroups.filter(g => g.id !== currentGroupId && !g.archived);

  return (
    <div className="group-form">
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

      {isSuperuser && otherGroups.length > 0 && (
        <div className="form-group">
          <label className="form-label" htmlFor="gf-linked">
            Plan teilen mit Gruppe
          </label>
          <select
            id="gf-linked"
            className="form-input"
            value={linkedGroup}
            onChange={e => setLinkedGroup(e.target.value)}
          >
            <option value="">Kein geteilter Plan</option>
            {otherGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <span className="form-label" style={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 400 }}>
            Diese Gruppe verwendet dann den Speiseplan der ausgewählten Gruppe.
          </span>
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
