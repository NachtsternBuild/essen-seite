import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';
import { pb } from '../lib/pocketbase';
import { useToastContext } from '../context/ToastContext';
import { isLocked } from '../lib/utils';
import type { Order, OrdersByUser, DayOfWeek, AuthUser, MealPlan, DayMeals } from '../types';

export function useOrders(
  planId: string | null,
  groupId: string | null,
  currentUser: AuthUser | null
) {
  const { addToast } = useToastContext();
  const [ordersByUser, setOrdersByUser] = useState<OrdersByUser>({});
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!planId) {
      setOrdersByUser({});
      setRawOrders([]);
      return;
    }
    setIsLoading(true);
    try {
      const orders = groupId
        ? await orderService.getOrdersForPlanAndGroup(planId, groupId)
        : await orderService.getOrdersForPlan(planId);
      setRawOrders(orders);
      setOrdersByUser(orderService.normalizeOrders(orders));
    } catch {
      // Suppress during auth transitions (login/logout) – not a real error
      if (pb.authStore.isValid) {
        addToast('Fehler beim Laden der Bestellungen.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [planId, groupId, addToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const placeOrder = useCallback(
    async (
      plan: MealPlan,
      meals: DayMeals,
      day: DayOfWeek,
      mealNumber: string,
      isCurrentWeek: boolean
    ) => {
      if (!currentUser) {
        addToast('Bitte anmelden!', 'warning');
        return;
      }
      if (isCurrentWeek && isLocked(day)) {
        addToast(
          'Nach 08:30 Uhr sind keine Änderungen für heute mehr möglich!',
          'warning'
        );
        return;
      }

      const dayMeals = meals[day] ?? [];
      const meal = dayMeals.find(m => m.number === mealNumber);
      if (!meal) {
        addToast('Menü-Nummer nicht gefunden!', 'error');
        return;
      }

      // Check for existing order to update
      const existingOrders = rawOrders.filter(
        o => o.user === currentUser.id && o.day === day
      );
      const existingId = existingOrders[0]?.id;

      try {
        await orderService.placeOrder(
          plan.id,
          groupId ?? plan.group,
          currentUser,
          day,
          meal.number,
          meal.name,
          typeof meal.price === 'number' ? meal.price : parseFloat(String(meal.price).replace(',', '.')),
          existingId
        );
        await refresh();
        addToast(
          `Bestellung für ${day} ${existingId ? 'geändert' : 'gespeichert'}.`,
          'success'
        );
      } catch {
        addToast('Fehler beim Speichern der Bestellung.', 'error');
      }
    },
    [currentUser, groupId, rawOrders, refresh, addToast]
  );

  const deleteOrder = useCallback(
    async (orderId: string, person: string, day: string) => {
      if (!currentUser) return;
      if (
        currentUser.name !== person &&
        !currentUser.is_admin &&
        !currentUser.is_superuser
      ) {
        addToast('Keine Berechtigung für diese Aktion.', 'error');
        return;
      }
      try {
        await orderService.deleteOrder(orderId);
        await refresh();
        addToast(`Bestellung für ${day} gelöscht.`, 'info');
      } catch {
        addToast('Fehler beim Löschen der Bestellung.', 'error');
      }
    },
    [currentUser, refresh, addToast]
  );

  const deleteUserOrders = useCallback(
    async (userId: string, planId: string, userName: string) => {
      if (!currentUser) return;
      if (
        currentUser.id !== userId &&
        !currentUser.is_admin &&
        !currentUser.is_superuser
      ) {
        addToast('Keine Berechtigung für diese Aktion.', 'error');
        return;
      }
      try {
        await orderService.deleteOrdersForUser(planId, userId, groupId ?? undefined);
        await refresh();
        addToast(`Bestellungen von ${userName} gelöscht.`, 'info');
      } catch {
        addToast('Fehler beim Löschen der Bestellungen.', 'error');
      }
    },
    [currentUser, groupId, refresh, addToast]
  );

  return {
    ordersByUser,
    rawOrders,
    isLoading,
    refresh,
    placeOrder,
    deleteOrder,
    deleteUserOrders,
  };
}
