import { useState, useEffect, useCallback } from 'react';
import { mealService } from '../services/mealService';
import { useToastContext } from '../context/ToastContext';
import type { MealPlan, MealItem, DayMeals, WeekStatus, SyncMode } from '../types';

export function useMeals(groupId: string | null, linkedGroupId?: string | null) {
  const { addToast } = useToastContext();
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
      } catch {
        addToast('Fehler beim Hinzufügen des Menüs.', 'error');
      }
    },
    [addToast]
  );

  const removeMeal = useCallback(
    async (planId: string, currentMeals: DayMeals, day: string, index: number) => {
      try {
        const updated = await mealService.removeMealFromDay(planId, currentMeals, day, index);
        if (updated.status === 'current') setCurrent(updated);
        else if (updated.status === 'upcoming') setUpcoming(updated);
      } catch {
        addToast('Fehler beim Entfernen des Menüs.', 'error');
      }
    },
    [addToast]
  );

  const rotateWeek = useCallback(async () => {
    if (!groupId) return;
    try {
      await mealService.rotateWeek(groupId);
      await refresh();
      addToast('Woche wurde rotiert. Neue Woche ist jetzt aktiv.', 'success');
    } catch {
      addToast('Fehler beim Wochenabschluss.', 'error');
    }
  }, [groupId, refresh, addToast]);

  const createPlan = useCallback(
    async (
      status: WeekStatus,
      fromPlan?: MealPlan,
      syncMode?: SyncMode
    ) => {
      if (!groupId) return;
      try {
        if (fromPlan) {
          await mealService.createFromPlan(groupId, fromPlan, status, syncMode ?? 'copy');
        } else {
          await mealService.createEmptyPlan(groupId, status);
        }
        // Refresh so isUsingLinkedPlan is re-evaluated after own plan is created
        await refresh();
        addToast('Wochenplan angelegt.', 'success');
      } catch {
        addToast('Fehler beim Anlegen des Wochenplans.', 'error');
      }
    },
    [groupId, refresh, addToast]
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
    setCurrent,
    setUpcoming,
    setPrevious,
  };
}
