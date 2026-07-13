import { describe, it, expect } from 'vitest';
import { computeStatistics, summarizeOrdersByUser } from '../lib/statistics';
import type { Order, MealPlan, OrdersByUser } from '../types';

function order(o: Partial<Order>): Order {
  return {
    id: Math.random().toString(36).slice(2),
    meal_plan: 'p1',
    group: 'g1',
    user: 'u1',
    user_name: 'User',
    day: 'Montag',
    meal_number: '1',
    meal_name: 'Menü 1',
    meal_price: 5,
    edited: false,
    created: '',
    updated: '',
    ...o,
  };
}

const dayMeals = [
  { number: '1', name: 'Menü 1', price: 5, vegetarian: true, allergens: ['A', 'G'] },
  { number: '2', name: 'Menü 2', price: 7, vegan: true, allergens: ['A'] },
  { number: '3', name: 'Schnitzel', price: 9 },
];

const plan: MealPlan = {
  id: 'p1',
  group: 'g1',
  year: 2026,
  week_number: 27,
  status: 'current',
  // Same menu offered Mon–Wed, so day-specific lookups resolve metadata.
  meals: { Montag: dayMeals, Dienstag: dayMeals, Mittwoch: dayMeals },
  created: '',
  updated: '',
};

describe('computeStatistics', () => {
  const orders = [
    order({ user: 'u1', meal_number: '1', meal_name: 'Menü 1', meal_price: 5 }),
    order({ user: 'u2', meal_number: '1', meal_name: 'Menü 1', meal_price: 5 }),
    order({ user: 'u3', meal_number: '2', meal_name: 'Menü 2', meal_price: 7, day: 'Dienstag' }),
    order({ user: 'u1', meal_number: '3', meal_name: 'Schnitzel', meal_price: 9, day: 'Mittwoch' }),
  ];
  const stats = computeStatistics(orders, [plan]);

  it('aggregates totals, revenue and unique users', () => {
    expect(stats.totalOrders).toBe(4);
    expect(stats.totalRevenue).toBe(26);
    expect(stats.uniqueUsers).toBe(3);
    expect(stats.averagePerOrder).toBeCloseTo(6.5);
  });

  it('ranks popular meals by count', () => {
    expect(stats.popularMeals[0]).toMatchObject({ number: '1', count: 2, revenue: 10 });
  });

  it('counts orders per day', () => {
    expect(stats.ordersByDay).toEqual({ Montag: 2, Dienstag: 1, Mittwoch: 1 });
  });

  it('classifies diet from meal metadata', () => {
    // Menü1 x2 vegetarian, Menü2 vegan, Schnitzel other
    expect(stats.diet).toEqual({ vegetarian: 2, vegan: 1, other: 1, total: 4 });
  });

  it('breaks down allergens with labels', () => {
    const a = Object.fromEntries(stats.allergens.map(x => [x.code, x.count]));
    expect(a.A).toBe(3); // Menü1 x2 + Menü2 x1
    expect(a.G).toBe(2); // Menü1 x2
    const gluten = stats.allergens.find(x => x.code === 'A');
    expect(gluten?.label).toBe('Gluten');
  });

  it('builds a weekly trend point', () => {
    expect(stats.trend).toHaveLength(1);
    expect(stats.trend[0]).toMatchObject({ year: 2026, week: 27, orders: 4, revenue: 26 });
  });

  it('handles an empty order set', () => {
    const empty = computeStatistics([], [plan]);
    expect(empty.totalOrders).toBe(0);
    expect(empty.averagePerOrder).toBe(0);
    expect(empty.popularMeals).toEqual([]);
  });
});

describe('summarizeOrdersByUser', () => {
  it('summarises a week of orders', () => {
    const obu: OrdersByUser = {
      Anna: {
        Montag: { id: 'a', meal_number: '1', meal_name: 'Menü 1', meal_price: 5, edited: false },
        Dienstag: { id: 'b', meal_number: '1', meal_name: 'Menü 1', meal_price: 5, edited: false },
      },
      Ben: {
        Montag: { id: 'c', meal_number: '2', meal_name: 'Menü 2', meal_price: 7, edited: false },
      },
    };
    const s = summarizeOrdersByUser(obu);
    expect(s.orders).toBe(3);
    expect(s.revenue).toBe(17);
    expect(s.participants).toBe(2);
    expect(s.topMeal).toMatchObject({ number: '1', count: 2 });
  });
});
