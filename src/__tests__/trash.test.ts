import { describe, it, expect } from 'vitest';
import { describeTrashEntry, trashCollectionLabel } from '../lib/trash';
import type { TrashEntry } from '../types';

function entry(data: Record<string, unknown>, overrides: Partial<TrashEntry> = {}): TrashEntry {
  return {
    id: 't1',
    collection_name: 'meal_plans',
    record_id: 'rec123',
    data,
    deleted_by_name: 'Admin',
    created: '2026-06-30T10:00:00Z',
    ...overrides,
  };
}

describe('trashCollectionLabel', () => {
  it('maps known collections to German labels', () => {
    expect(trashCollectionLabel('meal_plans')).toBe('Essensplan');
    expect(trashCollectionLabel('groups')).toBe('Gruppe');
    expect(trashCollectionLabel('orders')).toBe('Bestellung');
  });

  it('falls back to the raw collection name', () => {
    expect(trashCollectionLabel('mystery')).toBe('mystery');
  });
});

describe('describeTrashEntry', () => {
  it('prefers a name field (groups)', () => {
    expect(describeTrashEntry(entry({ name: 'Kantine Nord' }))).toBe('Kantine Nord');
  });

  it('describes orders by user and day', () => {
    expect(describeTrashEntry(entry({ user_name: 'Anna', day: 'Montag' }))).toBe('Anna · Montag');
  });

  it('describes a meal plan by calendar week', () => {
    expect(describeTrashEntry(entry({ week_number: 27, year: 2026 }))).toBe('KW 27 / 2026');
  });

  it('falls back to the record id when no friendly field exists', () => {
    expect(describeTrashEntry(entry({ foo: 'bar' }))).toBe('rec123');
  });
});
