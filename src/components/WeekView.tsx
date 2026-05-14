import { MealCard } from './MealCard';
import { OrderSummary } from './OrderSummary';
import type { WeekData, Meal, AuthUser } from '../types';
import { DAYS_OF_WEEK } from '../lib/pocketbase';

interface WeekViewProps {
  weekData: WeekData;
  allUsers: AuthUser[];
  currentUser: AuthUser | null;
  isArchive: boolean;
  isUpcomingView: boolean;
  onAddMeal?: (day: string, meal: Meal) => void;
  onRemoveMeal?: (day: string, index: number) => void;
  onRemoveOrder: (person: string, day: string) => void;
  onRemoveUser: (person: string) => void;
  onExportTXT: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function WeekView({
  weekData,
  allUsers,
  currentUser,
  isArchive,
  isUpcomingView,
  onAddMeal,
  onRemoveMeal,
  onRemoveOrder,
  onRemoveUser,
  onExportTXT,
  onExportCSV,
  onExportPDF,
}: WeekViewProps) {
  return (
    <div className="week-view">
      <div className="week-grid">
        {DAYS_OF_WEEK.map(day => (
          <MealCard
            key={day}
            day={day}
            meals={weekData.meals[day] ?? []}
            orders={weekData.orders}
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
        weekData={weekData}
        allUsers={allUsers}
        currentUser={currentUser}
        isArchive={isArchive}
        onRemoveUser={onRemoveUser}
        onExportTXT={onExportTXT}
        onExportCSV={onExportCSV}
        onExportPDF={onExportPDF}
      />
    </div>
  );
}
