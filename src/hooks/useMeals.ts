import { useState, useEffect, useCallback } from 'react';
import { mealService } from '../services/mealService';
import { useToastContext } from '../context/ToastContext';
import type { MealPlan, MealItem, DayMeals, WeekStatus, SyncMode } from '../types';

export function useMeals(groupId: string | null) {
  const { addToast } = useToastContext();
  const [current, setCurrent] = useState<MealPlan | null>(null);
  const [upcoming, setUpcoming] = useState<MealPlan | null>(null);
  const [previous, setPrevious] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const { current: c, upcoming: u, previous: p } =
        await mealService.getActivePlans(groupId);
      setCurrent(c);
      setUpcoming(u);
      setPrevious(p);
    } catch {
      addToast('Fehler beim Laden der Essenspläne.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, addToast]);

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
        let plan: MealPlan;
        if (fromPlan) {
          plan = await mealService.createFromPlan(groupId, fromPlan, status, syncMode ?? 'copy');
        } else {
          plan = await mealService.createEmptyPlan(groupId, status);
        }
        if (status === 'current') setCurrent(plan);
        else if (status === 'upcoming') setUpcoming(plan);
        addToast('Wochenplan angelegt.', 'success');
      } catch {
        addToast('Fehler beim Anlegen des Wochenplans.', 'error');
      }
    },
    [groupId, addToast]
  );

  return {
    current,
    upcoming,
    previous,
    isLoading,
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
