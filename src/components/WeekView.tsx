import { memo } from 'react';
import { ClipboardList } from 'lucide-react';
import { MealCard } from './MealCard';
import { OrderSummary } from './OrderSummary';
import { EmptyState } from './shared/EmptyState';
import { SkeletonWeek } from './shared/SkeletonLoader';
import type { MealItem, AuthUser, DayMeals, OrdersByUser } from '../types';
import { DAYS_OF_WEEK } from '../lib/pocketbase';

interface WeekViewProps {
  planId?: string;
  meals: DayMeals;
  ordersByUser: OrdersByUser;
  allUsers: AuthUser[];
  currentUser: AuthUser | null;
  isArchive: boolean;
  isUpcomingView: boolean;
  isLoading?: boolean;
  label?: string;
  onAddMeal?: (day: string, meal: MealItem) => void;
  onRemoveMeal?: (day: string, index: number) => void;
  onRemoveOrder: (orderId: string, person: string, day: string) => void;
  onDeleteUserOrders?: (userId: string, planId: string, userName: string) => void;
}

export const WeekView = memo(function WeekView({
  planId,
  meals,
  ordersByUser,
  allUsers,
  currentUser,
  isArchive,
  isUpcomingView,
  isLoading = false,
  label,
  onAddMeal,
  onRemoveMeal,
  onRemoveOrder,
  onDeleteUserOrders,
}: WeekViewProps) {
  if (isLoading) {
    return (
      <div className="week-view">
        <SkeletonWeek />
      </div>
    );
  }

  const hasMeals = Object.values(meals).some(m => m.length > 0);

  return (
    <div className="week-view">
      {!hasMeals && !currentUser?.is_admin && (
        <EmptyState
          icon={<ClipboardList size={48} strokeWidth={1.5} />}
          message="Für diese Woche sind noch keine Menüs eingetragen."
        />
      )}

      <div className="week-grid">
        {DAYS_OF_WEEK.map(day => (
          <MealCard
            key={day}
            day={day}
            meals={meals[day] ?? []}
            orders={ordersByUser}
            allUsers={allUsers}
            currentUser={currentUser}
            isArchive={isArchive}
            isUpcomingView={isUpcomingView}
            onAddMeal={onAddMeal}
            onRemoveMeal={onRemoveMeal}
            onRemoveOrder={onRemoveOrder}
          />
        ))}
      </div>

      <OrderSummary
        ordersByUser={ordersByUser}
        allUsers={allUsers}
        currentUser={currentUser}
        isArchive={isArchive}
        allMeals={meals as Record<string, unknown[]>}
        label={label ?? 'Woche'}
        onDeleteUserOrders={onDeleteUserOrders}
        planId={planId}
      />
    </div>
  );
});
