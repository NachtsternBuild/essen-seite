import { describe, it, expect } from 'vitest';
import {
  effectiveGroupSettings,
  wouldCreateCycle,
  groupAncestry,
} from '../lib/groupOptions';
import { DEFAULT_APP_SETTINGS } from '../services/settingsService';
import { groupExportSchema } from '../lib/validation';
import type { Group } from '../types';

function g(id: string, parent?: string, name = id): Pick<Group, 'id' | 'name' | 'parent_group'> {
  return { id, name, parent_group: parent };
}

describe('effectiveGroupSettings', () => {
  it('inherits every unset field from global defaults', () => {
    const eff = effectiveGroupSettings({ color: '', settings: {} }, DEFAULT_APP_SETTINGS);
    expect(eff.color).toBe(DEFAULT_APP_SETTINGS.default_color);
    expect(eff.language).toBe(DEFAULT_APP_SETTINGS.default_language);
    expect(eff.timezone).toBe(DEFAULT_APP_SETTINGS.default_timezone);
    expect(eff.order_deadline).toBe(DEFAULT_APP_SETTINGS.default_order_deadline);
  });

  it('prefers group overrides over defaults', () => {
    const eff = effectiveGroupSettings(
      { color: '#123456', settings: { language: 'en', order_deadline: '10:00' } },
      DEFAULT_APP_SETTINGS
    );
    expect(eff.color).toBe('#123456');
    expect(eff.language).toBe('en');
    expect(eff.order_deadline).toBe('10:00');
    // unset field still inherits
    expect(eff.currency).toBe(DEFAULT_APP_SETTINGS.default_currency);
  });
});

describe('wouldCreateCycle', () => {
  // a → b → c (c child of b, b child of a)
  const groups = [g('a'), g('b', 'a'), g('c', 'b'), g('x')];

  it('detects self-parenting', () => {
    expect(wouldCreateCycle(groups, 'a', 'a')).toBe(true);
  });

  it('detects a descendant becoming the parent', () => {
    // making a a child of c would close the loop a→b→c→a
    expect(wouldCreateCycle(groups, 'a', 'c')).toBe(true);
  });

  it('allows an unrelated parent', () => {
    expect(wouldCreateCycle(groups, 'x', 'a')).toBe(false);
  });

  it('treats empty/undefined parent as no cycle', () => {
    expect(wouldCreateCycle(groups, 'a', null)).toBe(false);
    expect(wouldCreateCycle(groups, 'a', undefined)).toBe(false);
  });
});

describe('groupAncestry', () => {
  const groups = [g('a', undefined, 'Werk'), g('b', 'a', 'Abteilung'), g('c', 'b', 'Team')];

  it('returns ancestors from root to nearest parent', () => {
    expect(groupAncestry(groups, 'c').map(x => x.name)).toEqual(['Werk', 'Abteilung']);
  });

  it('returns empty for a root group', () => {
    expect(groupAncestry(groups, 'a')).toEqual([]);
  });
});

describe('groupExportSchema', () => {
  it('accepts a valid export payload and fills defaults', () => {
    const result = groupExportSchema.safeParse({
      version: 1,
      exported_at: '2026-06-30T00:00:00.000Z',
      group: { name: 'Kantine' },
      meal_plans: [
        { year: 2026, week_number: 27, status: 'current', meals: { Montag: [] } },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.group.description).toBe('');
      expect(result.data.group.color).toBe('#d97706');
      expect(result.data.meal_plans).toHaveLength(1);
    }
  });

  it('rejects a wrong version', () => {
    const result = groupExportSchema.safeParse({
      version: 2,
      exported_at: 'x',
      group: { name: 'X' },
    });
    expect(result.success).toBe(false);
  });
});
