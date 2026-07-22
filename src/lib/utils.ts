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
    if (h > 7 || (h === 7 && m >= 30)) return true;
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

/** The calendar week after the current one, rolling the year over at week 52. */
export function nextCalendarWeek(): { year: number; week: number } {
  const week = getCurrentWeekNumber();
  const year = getCurrentYear();
  return week >= 52 ? { year: year + 1, week: 1 } : { year, week: week + 1 };
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
