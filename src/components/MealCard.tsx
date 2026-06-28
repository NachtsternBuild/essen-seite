import { memo } from 'react';
import { isLocked } from '../lib/utils';
import { AddMealForm } from './AddMealForm';
import type { MealItem, AuthUser, OrdersByUser } from '../types';
import { ALLERGENS } from '../types';

interface MealCardProps {
  day: string;
  meals: MealItem[];
  orders: OrdersByUser;
  allUsers: AuthUser[];
  currentUser: AuthUser | null;
  isArchive: boolean;
  isUpcomingView: boolean;
  onRemoveMeal?: (day: string, index: number) => void;
  onRemoveOrder: (orderId: string, person: string, day: string) => void;
  onAddMeal?: (day: string, meal: MealItem) => void;
}

export const MealCard = memo(function MealCard({
  day,
  meals,
  orders,
  allUsers,
  currentUser,
  isArchive,
  isUpcomingView,
  onRemoveMeal,
  onRemoveOrder,
  onAddMeal,
}: MealCardProps) {
  const dayLocked = isUpcomingView ? false : isLocked(day);

  const summary: Record<string, number> = {};
  Object.values(orders).forEach(dayMap => {
    const o = dayMap[day];
    if (o) summary[o.meal_number] = (summary[o.meal_number] || 0) + 1;
  });

  const sortedMeals = [...meals].sort(
    (a, b) => parseInt(a.number) - parseInt(b.number)
  );

  const dayOrders = Object.entries(orders)
    .map(([person, dayMap]) => ({ person, order: dayMap[day] }))
    .filter(({ order }) => !!order);

  const existingNumbers = meals.map(m => m.number);

  return (
    <div className={`meal-card${dayLocked && !isArchive ? ' meal-card--locked' : ''}`}>
      {/* ── Day header ── */}
      <div className="meal-card__header">
        <h3 className="meal-card__day">
          {day}
          {dayLocked && !isArchive && (
            <span className="meal-card__lock" title="Bestellschluss überschritten">
              🔒
            </span>
          )}
        </h3>
        {dayOrders.length > 0 && (
          <span className="meal-card__badge">
            {dayOrders.length} Bestellung{dayOrders.length !== 1 ? 'en' : ''}
          </span>
        )}
      </div>

      {/* ── Speisekarte ── */}
      <div className="meal-card__menu">
        <span className="meal-card__section-label">Speisekarte</span>
        {sortedMeals.length === 0 ? (
          <p className="meal-card__empty">Noch kein Menü eingetragen</p>
        ) : (
          sortedMeals.map((m, i) => (
            <div key={`${m.number}-${i}`} className="menu-item">
              <div className="menu-item__info">
                <span className="menu-item__number">#{m.number}</span>
                <span className="menu-item__name">{m.name}</span>
                <span className="menu-item__price">
                  {typeof m.price === 'number' ? m.price.toFixed(2).replace('.', ',') : m.price} €
                </span>
                {(m.vegan || m.vegetarian) && (
                  <span
                    className={`diet-badge${m.vegan ? ' diet-badge--vegan' : ' diet-badge--veg'}`}
                    title={m.vegan ? 'Vegan' : 'Vegetarisch'}
                  >
                    {m.vegan ? '🌱' : '🥦'}
                  </span>
                )}
                {m.allergens && m.allergens.length > 0 && (
                  <span
                    className="allergen-indicator"
                    title={m.allergens.map(a => `${a}: ${ALLERGENS[a] ?? a}`).join(', ')}
                  >
                    ⚠️ {m.allergens.join(',')}
                  </span>
                )}
              </div>
              {!isArchive && currentUser?.is_admin && !dayLocked && (
                <button
                  className="btn-icon btn-icon--danger"
                  onClick={() => onRemoveMeal?.(day, i)}
                  title="Menü entfernen"
                  aria-label={`Menü #${m.number} entfernen`}
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Summary badges ── */}
      {Object.keys(summary).length > 0 && (
        <div className="meal-card__summary">
          {Object.entries(summary)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([num, count]) => (
              <span key={num} className="summary-badge">
                {count}× #{num}
              </span>
            ))}
        </div>
      )}

      {/* ── Orders ── */}
      {dayOrders.length > 0 && (
        <div className="meal-card__orders">
          <span className="meal-card__section-label">Bestellungen</span>
          {dayOrders.map(({ person, order }) => {
            if (!order) return null;
            const userInfo = allUsers.find(u => u.name === person)?.info;
            const canRemove =
              !isArchive &&
              !dayLocked &&
              (person === currentUser?.name || currentUser?.is_admin || currentUser?.is_superuser);
            return (
              <div
                key={person}
                className={`order-row${order.edited ? ' order-row--edited' : ''}`}
              >
                {canRemove && (
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => onRemoveOrder(order.id, person, day)}
                    title="Bestellung entfernen"
                    aria-label={`Bestellung von ${person} für ${day} entfernen`}
                  >
                    ✕
                  </button>
                )}
                <span className="order-row__person">
                  {person}
                  {userInfo && (
                    <small className="order-row__info"> ({userInfo})</small>
                  )}
                </span>
                <span className="order-row__meal">
                  <strong>#{order.meal_number}</strong> {order.meal_name}
                </span>
                {order.edited && (
                  <span className="order-row__edited-tag">geändert</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add meal form (admin only) ── */}
      {!isArchive && currentUser?.is_admin && !dayLocked && onAddMeal && (
        <AddMealForm
          day={day}
          existingNumbers={existingNumbers}
          onAdd={onAddMeal}
        />
      )}
    </div>
  );
});
