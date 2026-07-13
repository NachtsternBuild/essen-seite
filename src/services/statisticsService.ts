import { orderService } from './orderService';
import { mealService } from './mealService';
import { computeStatistics } from '../lib/statistics';
import { parsePrice } from '../lib/utils';
import { ALLERGENS } from '../types';
import type { Group, GroupComparisonRow, Statistics } from '../types';

export const statisticsService = {
  /** Statistics for a single group (orders joined to that group's plans). */
  async getForGroup(groupId: string): Promise<Statistics> {
    const [orders, plans] = await Promise.all([
      orderService.getOrdersForGroup(groupId),
      mealService.getPlansForGroup(groupId),
    ]);
    return computeStatistics(orders, plans);
  },

  /**
   * Per-group comparison across the whole system (superuser). Fetches every
   * order once and aggregates by group.
   */
  async getGroupComparison(groups: Pick<Group, 'id' | 'name'>[]): Promise<GroupComparisonRow[]> {
    const orders = await orderService.getAllOrders();
    const byGroup = new Map<string, { orders: number; revenue: number; users: Set<string> }>();

    for (const order of orders) {
      let row = byGroup.get(order.group);
      if (!row) {
        row = { orders: 0, revenue: 0, users: new Set() };
        byGroup.set(order.group, row);
      }
      row.orders++;
      row.revenue += parsePrice(order.meal_price);
      if (order.user) row.users.add(order.user);
    }

    return groups
      .map(g => {
        const row = byGroup.get(g.id);
        return {
          groupId: g.id,
          groupName: g.name,
          orders: row?.orders ?? 0,
          revenue: row?.revenue ?? 0,
          users: row?.users.size ?? 0,
        };
      })
      .sort((a, b) => b.orders - a.orders);
  },

  // ── Export ───────────────────────────────────────────────────────────────

  /** Serialises a statistics snapshot to a flat CSV (semicolon-separated, de-friendly). */
  toCsv(stats: Statistics): string {
    const rows: string[][] = [];
    rows.push(['Kennzahl', 'Wert']);
    rows.push(['Bestellungen gesamt', String(stats.totalOrders)]);
    rows.push(['Umsatz gesamt', stats.totalRevenue.toFixed(2)]);
    rows.push(['Aktive Nutzer', String(stats.uniqueUsers)]);
    rows.push(['Ø pro Bestellung', stats.averagePerOrder.toFixed(2)]);
    rows.push(['Vegetarisch', String(stats.diet.vegetarian)]);
    rows.push(['Vegan', String(stats.diet.vegan)]);
    rows.push(['']);
    rows.push(['Beliebteste Menüs', 'Anzahl', 'Umsatz']);
    stats.popularMeals.forEach(m => rows.push([`${m.number} ${m.name}`, String(m.count), m.revenue.toFixed(2)]));
    rows.push(['']);
    rows.push(['Allergene', 'Anzahl']);
    stats.allergens.forEach(a => rows.push([`${a.code} ${a.label ?? ALLERGENS[a.code] ?? ''}`.trim(), String(a.count)]));
    rows.push(['']);
    rows.push(['Woche', 'Bestellungen', 'Umsatz']);
    stats.trend.forEach(t => rows.push([t.label, String(t.orders), t.revenue.toFixed(2)]));

    return rows
      .map(cells => cells.map(c => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';'))
      .join('\n');
  },

  toJson(stats: Statistics): string {
    return JSON.stringify(stats, null, 2);
  },
};
