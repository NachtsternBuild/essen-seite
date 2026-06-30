import { useState, useRef, useEffect } from 'react';
import { useGroupContext } from '../../context/GroupContext';
import type { AuthUser } from '../../types';

interface GroupSelectorProps {
  currentUser: AuthUser | null;
}

export function GroupSelector({ currentUser }: GroupSelectorProps) {
  const { activeGroup, allGroups, setActiveGroup } = useGroupContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  if (!currentUser?.is_superuser || allGroups.length <= 1) return null;

  return (
    <div className="group-selector" ref={ref}>
      <span className="group-selector__label">Gruppe</span>
      <button
        className="group-selector__trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Aktive Gruppe auswählen"
      >
        {activeGroup && (
          <span
            className="group-selector__dot"
            style={{ background: activeGroup.color || '#d97706' }}
            aria-hidden="true"
          />
        )}
        <span className="group-selector__trigger-name">
          {activeGroup?.name ?? '–'}
        </span>
        <span className="group-selector__chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="group-selector__dropdown" role="listbox" aria-label="Gruppe auswählen">
          {allGroups.map(g => (
            <button
              key={g.id}
              className={`group-selector__option${g.id === activeGroup?.id ? ' group-selector__option--active' : ''}`}
              role="option"
              aria-selected={g.id === activeGroup?.id}
              onClick={() => { setActiveGroup(g); setOpen(false); }}
            >
              <span
                className="group-selector__dot"
                style={{ background: g.color || '#d97706' }}
                aria-hidden="true"
              />
              <span>{g.name}</span>
              {g.id === activeGroup?.id && (
                <span className="group-selector__check" aria-hidden="true">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
