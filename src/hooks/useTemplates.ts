import { useState, useCallback } from 'react';
import { mealService } from '../services/mealService';
import { useToastContext } from '../context/ToastContext';
import { weekLabel } from '../lib/utils';
import type { AuthUser, Group, MealPlan, SharedPlan, SyncMode, WeekStatus } from '../types';

/**
 * Shared meal-plan templates: list published templates, publish a plan as a
 * template, and adopt a template into a group (as a copy or synced).
 */
export function useTemplates(activeGroup: Group | null, currentUser: AuthUser | null) {
  const { addToast } = useToastContext();
  const [items, setItems] = useState<SharedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await mealService.getSharedPlans());
    } catch {
      addToast('Fehler beim Laden der Vorlagen.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const publish = useCallback(
    async (plan: MealPlan) => {
      if (!activeGroup || !currentUser) return;
      try {
        await mealService.sharePlan(
          plan,
          activeGroup.id,
          activeGroup.name,
          currentUser.id,
          currentUser.name,
          `${activeGroup.name} – ${weekLabel(plan.year, plan.week_number)}`
        );
        addToast('Plan als Vorlage veröffentlicht.', 'success');
        void reload();
      } catch {
        addToast('Fehler beim Veröffentlichen der Vorlage.', 'error');
      }
    },
    [activeGroup, currentUser, addToast, reload]
  );

  /**
   * Adopts a template. When a plan for the target week already exists its meals
   * are replaced; otherwise a new plan is created (as copy or synced).
   */
  const adopt = useCallback(
    async (
      template: SharedPlan,
      mode: SyncMode,
      status: WeekStatus,
      existingPlan: MealPlan | null,
      onDone?: () => void
    ) => {
      if (!activeGroup) return;
      try {
        if (existingPlan) {
          await mealService.updateMeals(existingPlan.id, template.meals);
        } else {
          await mealService.adoptSharedPlan(template, activeGroup.id, mode, status);
        }
        addToast(
          mode === 'sync' ? 'Vorlage synchronisiert übernommen.' : 'Vorlage übernommen.',
          'success'
        );
        onDone?.();
      } catch {
        addToast('Fehler beim Übernehmen der Vorlage.', 'error');
      }
    },
    [activeGroup, addToast]
  );

  return { items, isLoading, reload, publish, adopt };
}
