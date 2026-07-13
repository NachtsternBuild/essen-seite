import type {
  Order,
  MealPlan,
  MealItem,
  Statistics,
  MealStat,
  DietStat,
  AllergenStat,
  TrendPoint,
  OrdersByUser,
  OrdersSummary,
} from '../types';
import { ALLERGENS } from '../types';
import { parsePrice, weekLabel } from './utils';

/**
 * Builds a lookup from an order to the {@link MealItem} it refers to, so we can
 * recover diet/allergen metadata that orders don't store themselves.
 * Key: `${planId}|${day}|${mealNumber}`.
 */
function buildMealIndex(plans: MealPlan[]): Map<string, MealItem> {
  const index = new Map<string, MealItem>();
  for (const plan of plans) {
    const meals = plan.meals ?? {};
    for (const [day, items] of Object.entries(meals)) {
      for (const item of items ?? []) {
        index.set(`${plan.id}|${day}|${item.number}`, item);
      }
    }
  }
  return index;
}

/**
 * Computes the full statistics snapshot from a set of orders plus the plans they
 * belong to (the plans supply meal metadata and the week each order falls in).
 *
 * Pure and deterministic — all aggregation logic lives here so it can be unit
 * tested without touching PocketBase.
 */
export function computeStatistics(orders: Order[], plans: MealPlan[]): Statistics {
  const mealIndex = buildMealIndex(plans);
  const planById = new Map(plans.map(p => [p.id, p]));

  let totalRevenue = 0;
  const mealCounts: Record<string, MealStat> = {};
  const ordersByDay: Record<string, number> = {};
  const users = new Set<string>();
  const diet: DietStat = { vegetarian: 0, vegan: 0, other: 0, total: 0 };
  const allergenCounts: Record<string, number> = {};
  const trendByWeek = new Map<string, TrendPoint>();

  for (const order of orders) {
    const price = parsePrice(order.meal_price);
    totalRevenue += price;
    ordersByDay[order.day] = (ordersByDay[order.day] ?? 0) + 1;
    if (order.user) users.add(order.user);

    // Popular meals (keyed by menu number + name to merge identical menus).
    const key = `${order.meal_number}|${order.meal_name}`;
    if (!mealCounts[key]) {
      mealCounts[key] = { number: order.meal_number, name: order.meal_name, count: 0, revenue: 0 };
    }
    mealCounts[key].count++;
    mealCounts[key].revenue += price;

    // Diet + allergens via meal metadata lookup.
    const meal = mealIndex.get(`${order.meal_plan}|${order.day}|${order.meal_number}`);
    diet.total++;
    if (meal?.vegan) diet.vegan++;
    else if (meal?.vegetarian) diet.vegetarian++;
    else diet.other++;
    for (const code of meal?.allergens ?? []) {
      allergenCounts[code] = (allergenCounts[code] ?? 0) + 1;
    }

    // Weekly trend.
    const plan = planById.get(order.meal_plan);
    if (plan) {
      const tKey = `${plan.year}-${plan.week_number}`;
      const existing = trendByWeek.get(tKey);
      if (existing) {
        existing.orders++;
        existing.revenue += price;
      } else {
        trendByWeek.set(tKey, {
          label: weekLabel(plan.year, plan.week_number),
          year: plan.year,
          week: plan.week_number,
          orders: 1,
          revenue: price,
        });
      }
    }
  }

  const popularMeals = Object.values(mealCounts).sort((a, b) => b.count - a.count);

  const allergens: AllergenStat[] = Object.entries(allergenCounts)
    .map(([code, count]) => ({ code, label: ALLERGENS[code] ?? code, count }))
    .sort((a, b) => b.count - a.count);

  const trend = [...trendByWeek.values()].sort(
    (a, b) => a.year - b.year || a.week - b.week
  );

  const totalOrders = orders.length;

  return {
    totalOrders,
    totalRevenue,
    uniqueUsers: users.size,
    averagePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    popularMeals,
    ordersByDay,
    diet,
    allergens,
    trend,
  };
}

/**
 * Summarises a single week's {@link OrdersByUser} map for dashboard cards
 * (count, revenue, participants, most-ordered meal).
 */
export function summarizeOrdersByUser(ordersByUser: OrdersByUser): OrdersSummary {
  let orders = 0;
  let revenue = 0;
  const participants = Object.keys(ordersByUser).length;
  const counts: Record<string, { number: string; name: string; count: number }> = {};

  for (const days of Object.values(ordersByUser)) {
    for (const meal of Object.values(days)) {
      orders++;
      revenue += parsePrice(meal.meal_price);
      const key = `${meal.meal_number}|${meal.meal_name}`;
      if (!counts[key]) counts[key] = { number: meal.meal_number, name: meal.meal_name, count: 0 };
      counts[key].count++;
    }
  }

  const topMeal = Object.values(counts).sort((a, b) => b.count - a.count)[0];
  return { orders, revenue, participants, topMeal };
}
