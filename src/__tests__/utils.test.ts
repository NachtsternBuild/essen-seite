import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isLocked,
  parsePrice,
  formatPrice,
  calculateUserTotal,
  initials,
  roleName,
  weekLabel,
} from '../lib/utils';

// ─── isLocked ─────────────────────────────────────────────────────────────────

describe('isLocked', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('locks past days', () => {
    vi.setSystemTime(new Date(2025, 0, 8, 10, 0)); // Wednesday 10:00
    expect(isLocked('Montag')).toBe(true);
    expect(isLocked('Dienstag')).toBe(true);
    vi.useRealTimers();
  });

  it('does not lock future days', () => {
    vi.setSystemTime(new Date(2025, 0, 6, 10, 0)); // Monday 10:00
    expect(isLocked('Dienstag')).toBe(false);
    expect(isLocked('Mittwoch')).toBe(false);
    vi.useRealTimers();
  });

  it('locks today after 08:30', () => {
    vi.setSystemTime(new Date(2025, 0, 6, 8, 31)); // Monday 08:31
    expect(isLocked('Montag')).toBe(true);
    vi.useRealTimers();
  });

  it('does not lock today before 08:30', () => {
    vi.setSystemTime(new Date(2025, 0, 6, 8, 29)); // Monday 08:29
    expect(isLocked('Montag')).toBe(false);
    vi.useRealTimers();
  });

  it('locks all days on weekend', () => {
    vi.setSystemTime(new Date(2025, 0, 4, 10, 0)); // Saturday
    expect(isLocked('Montag')).toBe(true);
    expect(isLocked('Freitag')).toBe(true);
    vi.useRealTimers();
  });
});

// ─── parsePrice ───────────────────────────────────────────────────────────────

describe('parsePrice', () => {
  it('parses comma-decimal format', () => {
    expect(parsePrice('5,50')).toBe(5.5);
    expect(parsePrice('10,00')).toBe(10);
  });

  it('parses dot-decimal format', () => {
    expect(parsePrice('5.50')).toBe(5.5);
    expect(parsePrice(3.75)).toBe(3.75);
  });

  it('returns 0 for invalid input', () => {
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('abc')).toBe(0);
  });
});

// ─── formatPrice ─────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats with comma decimal', () => {
    expect(formatPrice(5.5)).toBe('5,50');
    expect(formatPrice('3.00')).toBe('3,00');
  });
});

// ─── calculateUserTotal ──────────────────────────────────────────────────────

describe('calculateUserTotal', () => {
  it('sums order prices', () => {
    const orders = {
      Montag:    { price: '5,50' },
      Dienstag:  { price: 4.75 },
      Mittwoch:  { price: '6,00' },
    };
    expect(calculateUserTotal(orders)).toBeCloseTo(16.25);
  });

  it('returns 0 for empty orders', () => {
    expect(calculateUserTotal({})).toBe(0);
  });
});

// ─── initials ─────────────────────────────────────────────────────────────────

describe('initials', () => {
  it('returns first two initials', () => {
    expect(initials('Anna Becker')).toBe('AB');
    expect(initials('Max')).toBe('M');
    expect(initials('Kai Lars Müller')).toBe('KL');
  });
});

// ─── roleName ────────────────────────────────────────────────────────────────

describe('roleName', () => {
  it('returns correct role labels', () => {
    expect(roleName(true, true)).toBe('Superuser');
    expect(roleName(false, true)).toBe('Admin');
    expect(roleName(false, false)).toBe('Nutzer');
  });
});

// ─── weekLabel ───────────────────────────────────────────────────────────────

describe('weekLabel', () => {
  it('formats calendar week label', () => {
    expect(weekLabel(2025, 3)).toBe('KW 3 / 2025');
  });
});
