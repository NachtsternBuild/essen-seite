import { useState, useEffect, useCallback } from 'react';
import { mealService } from '../services/mealService';
import { planHistoryService } from '../services/planHistoryService';
import { notificationService } from '../services/notificationService';
import { trashService } from '../services/trashService';
import { useToastContext } from '../context/ToastContext';
import type { MealPlan, MealItem, DayMeals, WeekStatus, SyncMode, AuthUser } from '../types';

export function useMeals(
  groupId: string | null,
  linkedGroupId?: string | null,
  currentUser?: AuthUser | null
) {
  const { addToast } = useToastContext();
  const actor = currentUser ?? null;
  const [current, setCurrent] = useState<MealPlan | null>(null);
  const [upcoming, setUpcoming] = useState<MealPlan | null>(null);
  const [previous, setPrevious] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingLinkedPlan, setIsUsingLinkedPlan] = useState(false);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const ownPlans = await mealService.getActivePlans(groupId);
      // Only active (non-archived) plans count: archived plans are old rotated weeks
      // and should not block the fallback to a linked group's plan.
      const hasOwn = !!(ownPlans.current || ownPlans.upcoming);

      if (hasOwn || !linkedGroupId) {
        setCurrent(ownPlans.current);
        setUpcoming(ownPlans.upcoming);
        setPrevious(ownPlans.previous);
        setIsUsingLinkedPlan(false);
      } else {
        // No own plans – show the linked group's plans as read-only fallback
        const linked = await mealService.getActivePlans(linkedGroupId);
        setCurrent(linked.current);
        setUpcoming(linked.upcoming);
        setPrevious(linked.previous);
        setIsUsingLinkedPlan(true);
      }
    } catch {
      addToast('Fehler beim Laden der Essenspläne.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, linkedGroupId, addToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMeal = useCallback(
    async (planId: string, currentMeals: DayMeals, day: string, meal: MealItem) => {
      // Duplicate number check
      const existing = currentMeals[day] ?? [];
      if (existing.some(m => m.number === meal.number)) {
        addToast(`Menünummer #${meal.number} existiert bereits für ${day}.`, 'warning');
        return;
      }
      try {
        const updated = await mealService.addMealToDay(planId, currentMeals, day, meal);
        if (updated.status === 'current') setCurrent(updated);
        else if (updated.status === 'upcoming') setUpcoming(updated);
        void planHistoryService.record({
          planId,
          group: groupId ?? undefined,
          actor,
          action: 'meal_added',
          day,
          summary: `Menü ${meal.number} „${meal.name}" zu ${day} hinzugefügt`,
          before: currentMeals[day] ?? [],
          after: updated.meals[day] ?? [],
        });
      } catch {
        addToast('Fehler beim Hinzufügen des Menüs.', 'error');
      }
    },
    [addToast, groupId, actor]
  );

  const removeMeal = useCallback(
    async (planId: string, currentMeals: DayMeals, day: string, index: number) => {
      const removed = (currentMeals[day] ?? [])[index];
      try {
        const updated = await mealService.removeMealFromDay(planId, currentMeals, day, index);
        if (updated.status === 'current') setCurrent(updated);
        else if (updated.status === 'upcoming') setUpcoming(updated);
        void planHistoryService.record({
          planId,
          group: groupId ?? undefined,
          actor,
          action: 'meal_removed',
          day,
          summary: removed
            ? `Menü ${removed.number} „${removed.name}" aus ${day} entfernt`
            : `Menü aus ${day} entfernt`,
          before: currentMeals[day] ?? [],
          after: updated.meals[day] ?? [],
        });
      } catch {
        addToast('Fehler beim Entfernen des Menüs.', 'error');
      }
    },
    [addToast, groupId, actor]
  );

  const rotateWeek = useCallback(async () => {
    if (!groupId) return;
    try {
      await mealService.rotateWeek(groupId);
      await refresh();
      // Notify members, but not the admin who triggered the rotation.
      void notificationService.notifyGroup(
        groupId,
        {
          type: 'new_week',
          title: 'Neue Woche aktiv',
          message: 'Der Wochenplan wurde rotiert. Die neue Woche ist jetzt aktiv.',
        },
        actor?.id
      );
      addToast('Woche wurde rotiert. Neue Woche ist jetzt aktiv.', 'success');
    } catch {
      addToast('Fehler beim Wochenabschluss.', 'error');
    }
  }, [groupId, refresh, addToast, actor]);

  const createPlan = useCallback(
    async (
      status: WeekStatus,
      fromPlan?: MealPlan,
      syncMode?: SyncMode
    ) => {
      if (!groupId) return;
      try {
        const created = fromPlan
          ? await mealService.createFromPlan(groupId, fromPlan, status, syncMode ?? 'copy')
          : await mealService.createEmptyPlan(groupId, status);
        // Refresh so isUsingLinkedPlan is re-evaluated after own plan is created
        await refresh();
        void planHistoryService.record({
          planId: created.id,
          group: groupId,
          actor,
          action: 'created',
          summary: fromPlan
            ? `Plan erstellt (aus Vorlage, ${syncMode === 'sync' ? 'synchronisiert' : 'Kopie'})`
            : 'Leerer Plan erstellt',
          after: created.meals,
        });
        addToast('Wochenplan angelegt.', 'success');
      } catch {
        addToast('Fehler beim Anlegen des Wochenplans.', 'error');
      }
    },
    [groupId, refresh, addToast, actor]
  );

  /** Soft-deletes a plan into the trash (restorable via the Papierkorb). */
  const deletePlan = useCallback(
    async (plan: MealPlan) => {
      try {
        await trashService.softDelete({
          collection: 'meal_plans',
          record: plan as unknown as { id: string } & Record<string, unknown>,
          actor,
          group: groupId ?? undefined,
        });
        await refresh();
        addToast('Plan in den Papierkorb verschoben.', 'info');
      } catch {
        addToast('Fehler beim Löschen des Plans.', 'error');
      }
    },
    [groupId, refresh, addToast, actor]
  );

  return {
    current,
    upcoming,
    previous,
    isLoading,
    isUsingLinkedPlan,
    refresh,
    addMeal,
    removeMeal,
    rotateWeek,
    createPlan,
    deletePlan,
    setCurrent,
    setUpcoming,
    setPrevious,
  };
}
