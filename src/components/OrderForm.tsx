import { useState, useMemo } from 'react';
import type { AuthUser, MealsState } from '../types';

interface OrderFormProps {
  days: string[];
  currentUser: AuthUser | null;
  allMeals: MealsState;
  onOrder: (day: string, mealNumber: string) => void;
}

export function OrderForm({ days, currentUser, allMeals, onOrder }: OrderFormProps) {
  const [day, setDay] = useState(days[0] ?? '');
  const [nr, setNr] = useState('');

  const availableMenus = useMemo(() => {
    const meals = allMeals[day] ?? [];
    return [...meals].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [day, allMeals]);

  if (!currentUser) return null;
  if (days.length === 0) return (
    <div className="order-form order-form--empty">
      <p>Alle Bestellfristen für diese Woche sind abgelaufen.</p>
    </div>
  );

  const handleOrder = () => {
    if (!nr) return;
    onOrder(day, nr);
    setNr('');
  };

  return (
    <div className="order-form">
      <div className="order-form__header">
        <h3 className="order-form__title">🛒 Essen bestellen</h3>
        <span className="order-form__user">für <strong>{currentUser.name}</strong></span>
      </div>

      <div className="order-form__controls">
        <select
          className="form-input"
          value={day}
          onChange={e => { setDay(e.target.value); setNr(''); }}
          aria-label="Tag auswählen"
        >
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          className="form-input"
          value={nr}
          onChange={e => setNr(e.target.value)}
          aria-label="Menü auswählen"
          disabled={availableMenus.length === 0}
        >
          <option value="">Menü wählen …</option>
          {availableMenus.map(m => (
            <option key={m.number} value={m.number}>
              #{m.number} – {m.name} ({m.price} €)
            </option>
          ))}
        </select>

        <button
          className="btn btn--primary"
          onClick={handleOrder}
          disabled={!nr}
        >
          Bestellen
        </button>
      </div>

      {availableMenus.length === 0 && day && (
        <p className="order-form__notice">Für {day} sind noch keine Menüs eingetragen.</p>
      )}
    </div>
  );
}
