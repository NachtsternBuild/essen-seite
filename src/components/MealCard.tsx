import { isLocked } from '../lib/utils';
import { AddMealForm } from './AddMealForm';
import type { Meal, Orders, AuthUser } from '../types';

interface MealCardProps {
  day: string;
  meals: Meal[];
  orders: Orders;
  allUsers: AuthUser[];
  currentUser: AuthUser | null;
  isArchive: boolean;
  isUpcomingView: boolean;
  onRemoveMeal?: (day: string, index: number) => void;
  onRemoveOrder: (person: string, day: string) => void;
  onAddMeal?: (day: string, meal: Meal) => void;
}

export function MealCard({
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

  // count per meal number for the summary badges
  const summary: Record<string, number> = {};
  Object.values(orders).forEach(o => {
    if (o[day]) summary[o[day].number] = (summary[o[day].number] || 0) + 1;
  });

  const sortedMeals = [...meals].sort(
    (a, b) => parseInt(a.number) - parseInt(b.number)
  );

  const dayOrders = Object.entries(orders)
    .map(([person, days]) => ({ person, order: days[day] }))
    .filter(({ order }) => !!order);

  const orderedCount = dayOrders.length;

  return (
    <div className={`meal-card${dayLocked && !isArchive ? ' meal-card--locked' : ''}`}>
      {/* ── Day header ── */}
      <div className="meal-card__header">
        <h3 className="meal-card__day">
          {day}
          {dayLocked && !isArchive && <span className="meal-card__lock" title="Bestellschluss überschritten">🔒</span>}
        </h3>
        {orderedCount > 0 && (
          <span className="meal-card__badge">{orderedCount} Bestellung{orderedCount !== 1 ? 'en' : ''}</span>
        )}
      </div>

      {/* ── Speisekarte ── */}
      <div className="meal-card__menu">
        <span className="meal-card__section-label">Speisekarte</span>
        {sortedMeals.length === 0 ? (
          <p className="meal-card__empty">Noch kein Menü eingetragen</p>
        ) : (
          sortedMeals.map((m, i) => (
            <div key={i} className="menu-item">
              <div className="menu-item__info">
                <span className="menu-item__number">#{m.number}</span>
                <span className="menu-item__name">{m.name}</span>
                <span className="menu-item__price">{m.price} €</span>
              </div>
              {!isArchive && currentUser?.is_admin && !dayLocked && (
                <button
                  className="btn-icon btn-icon--danger"
                  onClick={() => onRemoveMeal?.(day, i)}
                  title="Menü entfernen"
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
          {Object.entries(summary).sort().map(([num, count]) => (
            <span key={num} className="summary-badge">
              {count}× Menü #{num}
            </span>
          ))}
        </div>
      )}

      {/* ── Orders ── */}
      {dayOrders.length > 0 && (
        <div className="meal-card__orders">
          <span className="meal-card__section-label">Bestellungen</span>
          {dayOrders.map(({ person, order }) => {
            const userInfo = allUsers.find(u => u.name === person)?.info;
            const canRemove =
              !isArchive &&
              !dayLocked &&
              (person === currentUser?.name || currentUser?.is_admin);
            return (
              <div key={person} className={`order-row${order.edited ? ' order-row--edited' : ''}`}>
                {canRemove && (
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => onRemoveOrder(person, day)}
                    title="Bestellung entfernen"
                  >
                    ✕
                  </button>
                )}
                <span className="order-row__person">
                  {person}
                  {userInfo && <small className="order-row__info"> ({userInfo})</small>}
                </span>
                <span className="order-row__meal">
                  <strong>#{order.number}</strong> {order.name}
                </span>
                {order.edited && <span className="order-row__edited-tag">geändert</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add meal form (admin only) ── */}
      {!isArchive && currentUser?.is_admin && !dayLocked && onAddMeal && (
        <AddMealForm day={day} onAdd={onAddMeal} />
      )}
    </div>
  );
}
