import { useState, useMemo } from 'react';
import type { AuthUser, DayMeals, DayOfWeek, MealItem } from '../types';
import { ALLERGENS } from '../types';
import { isLocked } from '../lib/utils';
import { CustomSelect, type SelectOption } from './shared/CustomSelect';

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

  const dayOptions: SelectOption[] = availableDays.map(d => ({ value: d, label: d }));

  const mealOptions: SelectOption[] = [
    { value: '', label: 'Menü wählen …' },
    ...availableMenus.map(m => {
      const price = typeof m.price === 'number'
        ? m.price.toFixed(2).replace('.', ',')
        : m.price;
      const dietLabel = m.vegan ? ' 🌱 Vegan' : m.vegetarian ? ' 🥦 Vegetarisch' : '';
      return {
        value: m.number,
        label: `#${m.number} – ${m.name}${dietLabel}`,
        node: (
          <div className="meal-option">
            <span className="meal-option__num">#{m.number}</span>
            <span className="meal-option__name">{m.name}</span>
            <span className="meal-option__price">{price} €</span>
            {m.vegan && (
              <span className="diet-badge diet-badge--vegan">🌱 Vegan</span>
            )}
            {!m.vegan && m.vegetarian && (
              <span className="diet-badge diet-badge--veg">🥦 Vegetarisch</span>
            )}
          </div>
        ),
      };
    }),
  ];

  return (
    <div className="order-form">
      <div className="order-form__header">
        <h3 className="order-form__title">🛒 Essen bestellen</h3>
        <span className="order-form__user">
          für <strong>{currentUser.name}</strong>
        </span>
      </div>

      <div className="order-form__controls">
        <CustomSelect
          value={day}
          options={dayOptions}
          onChange={v => { setDay(v); setNr(''); }}
          ariaLabel="Tag auswählen"
        />

        <CustomSelect
          value={nr}
          options={mealOptions}
          onChange={setNr}
          placeholder="Menü wählen …"
          disabled={availableMenus.length === 0}
          ariaLabel="Menü auswählen"
        />

        <button
          className="btn btn--primary"
          onClick={handleOrder}
          disabled={!nr}
          aria-label={nr ? `Menü #${nr} für ${day} bestellen` : 'Bestellen'}
        >
          Bestellen
        </button>
      </div>

      {selectedMeal && (selectedMeal.vegan || selectedMeal.vegetarian || (selectedMeal.allergens && selectedMeal.allergens.length > 0)) && (
        <div className="order-form__meal-info">
          {(selectedMeal.vegan || selectedMeal.vegetarian) && (
            <span className={`diet-badge${selectedMeal.vegan ? ' diet-badge--vegan' : ' diet-badge--veg'}`}>
              {selectedMeal.vegan ? '🌱 Vegan' : '🥦 Vegetarisch'}
            </span>
          )}
          {selectedMeal.allergens && selectedMeal.allergens.length > 0 && (
            <span className="order-form__allergens">
              ⚠️ Enthält: {selectedMeal.allergens.map(a => `${a} (${ALLERGENS[a] ?? a})`).join(', ')}
            </span>
          )}
        </div>
      )}

      {availableMenus.length === 0 && day && (
        <p className="order-form__notice">
          Für {day} sind noch keine Menüs eingetragen.
        </p>
      )}
    </div>
  );
}
