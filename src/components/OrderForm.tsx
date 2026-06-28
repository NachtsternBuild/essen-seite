import { useState, useMemo } from 'react';
import type { AuthUser, DayMeals, DayOfWeek, MealItem } from '../types';
import { isLocked } from '../lib/utils';

interface OrderFormProps {
  days: readonly string[];
  currentUser: AuthUser | null;
  allMeals: DayMeals;
  onOrder: (day: DayOfWeek, mealNumber: string) => void;
  isCurrentWeek?: boolean;
}

export function OrderForm({
  days,
  currentUser,
  allMeals,
  onOrder,
  isCurrentWeek = false,
}: OrderFormProps) {
  const availableDays = useMemo(() => {
    return (days as string[]).filter(d =>
      isCurrentWeek ? !isLocked(d) : true
    );
  }, [days, isCurrentWeek]);

  const [day, setDay] = useState<string>(availableDays[0] ?? '');
  const [nr, setNr] = useState('');

  const availableMenus = useMemo((): MealItem[] => {
    const meals = allMeals[day] ?? [];
    return [...meals].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [day, allMeals]);

  if (!currentUser) return null;

  if (availableDays.length === 0) {
    return (
      <div className="order-form order-form--empty">
        <p>Alle Bestellfristen für diese Woche sind abgelaufen.</p>
      </div>
    );
  }

  const handleOrder = () => {
    if (!nr || !day) return;
    onOrder(day as DayOfWeek, nr);
    setNr('');
  };

  const selectedMeal = availableMenus.find(m => m.number === nr);

  return (
    <div className="order-form">
      <div className="order-form__header">
        <h3 className="order-form__title">🛒 Essen bestellen</h3>
        <span className="order-form__user">
          für <strong>{currentUser.name}</strong>
        </span>
      </div>

      <div className="order-form__controls">
        <select
          className="form-input"
          value={day}
          onChange={e => {
            setDay(e.target.value);
            setNr('');
          }}
          aria-label="Tag auswählen"
        >
          {availableDays.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
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
              #{m.number} – {m.name} ({typeof m.price === 'number' ? m.price.toFixed(2).replace('.', ',') : m.price} €)
              {m.vegan ? ' 🌱' : m.vegetarian ? ' 🥦' : ''}
            </option>
          ))}
        </select>

        <button
          className="btn btn--primary"
          onClick={handleOrder}
          disabled={!nr}
          aria-label={`${nr ? `Menü #${nr} für ${day} bestellen` : 'Bestellen'}`}
        >
          Bestellen
        </button>
      </div>

      {selectedMeal?.allergens && selectedMeal.allergens.length > 0 && (
        <p className="order-form__allergens">
          ⚠️ Enthält: {selectedMeal.allergens.join(', ')}
        </p>
      )}

      {availableMenus.length === 0 && day && (
        <p className="order-form__notice">
          Für {day} sind noch keine Menüs eingetragen.
        </p>
      )}
    </div>
  );
}
