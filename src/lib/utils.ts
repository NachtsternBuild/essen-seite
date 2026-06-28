import type { WeekStats, MealStat, WeekData, DayOfWeek } from '../types';

// ─── Day lock logic ───────────────────────────────────────────────────────────

const DAYS_MAP: Record<string, number> = {
  Montag: 1,
  Dienstag: 2,
  Mittwoch: 3,
  Donnerstag: 4,
  Freitag: 5,
};

export function isLocked(day: string): boolean {
  const now = new Date();
  const targetDayNum = DAYS_MAP[day];
  const currentDayNum = now.getDay();

  if (currentDayNum === 0 || currentDayNum === 6) return true;
  if (currentDayNum > targetDayNum) return true;
  if (currentDayNum === targetDayNum) {
    const h = now.getHours();
    const m = now.getMinutes();
    if (h > 8 || (h === 8 && m >= 30)) return true;
  }
  return false;
}

// ─── Price utilities ──────────────────────────────────────────────────────────

export function parsePrice(price: string | number): number {
  return parseFloat(String(price).replace(',', '.')) || 0;
}

export function formatPrice(price: string | number): string {
  return parsePrice(price).toFixed(2).replace('.', ',');
}

export function calculateUserTotal(
  orders: Record<string, { price: string | number }>
): number {
  return Object.values(orders).reduce(
    (sum, m) => sum + parsePrice(m.price),
    0
  );
}

// ─── File download ────────────────────────────────────────────────────────────

export function downloadFile(
  content: string,
  fileName: string,
  contentType: string
): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Calendar utilities ───────────────────────────────────────────────────────

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.ceil((days + start.getDay() + 1) / 7);
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function weekLabel(year: number, week: number): string {
  return `KW ${week} / ${year}`;
}

export function getWeekDates(year: number, week: number): Date[] {
  const jan1 = new Date(year, 0, 1);
  const daysToMonday = (8 - jan1.getDay()) % 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + daysToMonday + (week - 1) * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(firstMonday);
    d.setDate(firstMonday.getDate() + i);
    return d;
  });
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export function computeWeekStats(weekData: WeekData): WeekStats {
  const allOrders = Object.values(weekData.orders);
  let totalOrders = 0;
  let totalRevenue = 0;
  const mealCounts: Record<string, MealStat> = {};
  const ordersByDay: Record<string, number> = {};

  allOrders.forEach(userOrders => {
    Object.entries(userOrders).forEach(([day, meal]) => {
      totalOrders++;
      const price = parsePrice(meal.price);
      totalRevenue += price;
      ordersByDay[day] = (ordersByDay[day] ?? 0) + 1;

      const key = meal.number;
      if (!mealCounts[key]) {
        mealCounts[key] = {
          number: meal.number,
          name: meal.name,
          count: 0,
          revenue: 0,
        };
      }
      mealCounts[key].count++;
      mealCounts[key].revenue += price;
    });
  });

  const popularMeals = Object.values(mealCounts).sort(
    (a, b) => b.count - a.count
  );
  const personCount = allOrders.length;

  return {
    totalOrders,
    totalRevenue,
    popularMeals,
    ordersByDay,
    averagePerPerson: personCount > 0 ? totalRevenue / personCount : 0,
  };
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function roleName(
  is_superuser: boolean,
  is_admin: boolean
): string {
  if (is_superuser) return 'Superuser';
  if (is_admin) return 'Admin';
  return 'Nutzer';
}

// ─── Day utilities ────────────────────────────────────────────────────────────

export function unlockedDays(days: readonly string[]): string[] {
  return days.filter(d => !isLocked(d));
}

export function formatDay(day: DayOfWeek, date?: Date): string {
  if (!date) return day;
  return `${day} ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
}
