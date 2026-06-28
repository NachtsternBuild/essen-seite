import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createUserSchema,
  groupSchema,
  mealItemSchema,
} from '../lib/validation';

// ─── loginSchema ──────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid email + password', () => {
    const r = loginSchema.safeParse({ email: 'user@firma.de', password: 'secret123' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(r.success).toBe(false);
  });

  it('rejects short password', () => {
    const r = loginSchema.safeParse({ email: 'user@firma.de', password: '123' });
    expect(r.success).toBe(false);
  });

  it('rejects empty fields', () => {
    const r = loginSchema.safeParse({ email: '', password: '' });
    expect(r.success).toBe(false);
  });
});

// ─── createUserSchema ─────────────────────────────────────────────────────────

describe('createUserSchema', () => {
  const valid = { name: 'Anna', email: 'anna@firma.de', password: 'securepass' };

  it('accepts valid user', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects whitespace-only name', () => {
    const r = createUserSchema.safeParse({ ...valid, name: '   ' });
    expect(r.success).toBe(false);
  });

  it('rejects name over 50 chars', () => {
    const r = createUserSchema.safeParse({ ...valid, name: 'A'.repeat(51) });
    expect(r.success).toBe(false);
  });

  it('rejects password under 6 chars', () => {
    const r = createUserSchema.safeParse({ ...valid, password: '12345' });
    expect(r.success).toBe(false);
  });
});

// ─── groupSchema ──────────────────────────────────────────────────────────────

describe('groupSchema', () => {
  it('accepts valid group', () => {
    const r = groupSchema.safeParse({ name: 'Kantine Nord', color: '#d97706' });
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = groupSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid hex color', () => {
    const r = groupSchema.safeParse({ name: 'Test', color: 'red' });
    expect(r.success).toBe(false);
  });

  it('accepts valid hex color', () => {
    const r = groupSchema.safeParse({ name: 'Test', color: '#ff0000' });
    expect(r.success).toBe(true);
  });
});

// ─── mealItemSchema ───────────────────────────────────────────────────────────

describe('mealItemSchema', () => {
  const valid = { number: '1', name: 'Schnitzel', price: 5.50 };

  it('accepts valid meal item', () => {
    expect(mealItemSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects price of 0', () => {
    const r = mealItemSchema.safeParse({ ...valid, price: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects negative price', () => {
    const r = mealItemSchema.safeParse({ ...valid, price: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects non-numeric meal number', () => {
    const r = mealItemSchema.safeParse({ ...valid, number: 'abc' });
    expect(r.success).toBe(false);
  });

  it('coerces string price to number', () => {
    const r = mealItemSchema.safeParse({ ...valid, price: '5.50' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.price).toBe(5.5);
  });

  it('rejects whitespace-only name', () => {
    const r = mealItemSchema.safeParse({ ...valid, name: '   ' });
    expect(r.success).toBe(false);
  });
});
