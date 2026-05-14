const DAYS_MAP: Record<string, number> = {
  Montag: 1,
  Dienstag: 2,
  Mittwoch: 3,
  Donnerstag: 4,
  Freitag: 5,
};

/** Returns true if ordering for that day is no longer allowed */
export function isLocked(day: string): boolean {
  const now = new Date();
  const targetDayNum = DAYS_MAP[day];
  const currentDayNum = now.getDay(); // 0 = Sun, 1 = Mon …

  // Weekend → whole week locked
  if (currentDayNum === 0 || currentDayNum === 6) return true;

  // Day already passed
  if (currentDayNum > targetDayNum) return true;

  // Same day but after 08:30
  if (currentDayNum === targetDayNum) {
    const h = now.getHours();
    const m = now.getMinutes();
    if (h > 8 || (h === 8 && m >= 30)) return true;
  }

  return false;
}

/** Parses a price string like "5,50" or "5.50" to float */
export function parsePrice(price: string | number): number {
  return parseFloat(String(price).replace(',', '.')) || 0;
}

/** Calculates total for a user's orders */
export function calculateUserTotal(orders: Record<string, { price: string | number }>): number {
  return Object.values(orders).reduce((sum, m) => sum + parsePrice(m.price), 0);
}

/** Downloads a text file to the user's machine */
export function downloadFile(content: string, fileName: string, contentType: string): void {
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
