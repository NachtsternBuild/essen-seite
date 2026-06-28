import { useGroupContext } from '../../context/GroupContext';
import type { AuthUser } from '../../types';

interface GroupSelectorProps {
  currentUser: AuthUser | null;
}

export function GroupSelector({ currentUser }: GroupSelectorProps) {
  const { activeGroup, allGroups, setActiveGroup } = useGroupContext();

  if (!currentUser?.is_superuser || allGroups.length <= 1) return null;

  return (
    <div className="group-selector">
      <label className="group-selector__label" htmlFor="group-select">
        Gruppe
      </label>
      <select
        id="group-select"
        className="form-input form-input--sm group-selector__select"
        value={activeGroup?.id ?? ''}
        onChange={e => {
          const g = allGroups.find(g => g.id === e.target.value);
          if (g) setActiveGroup(g);
        }}
        aria-label="Aktive Gruppe auswählen"
      >
        {allGroups.map(g => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      {activeGroup && (
        <span
          className="group-selector__dot"
          style={{ background: activeGroup.color || '#d97706' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
