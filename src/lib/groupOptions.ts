import type { AppSettings, Group, GroupSettings, ExportFormat } from '../types';
import type { SelectOption } from '../components/shared/CustomSelect';

/**
 * Static option catalogs for group/global settings. Kept deliberately small and
 * European-focused; extend as needed without touching consuming components.
 */
export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'pl', label: 'Polski' },
];

export const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'Europe/Berlin', label: 'Europa/Berlin (MEZ)' },
  { value: 'Europe/Vienna', label: 'Europa/Wien' },
  { value: 'Europe/Zurich', label: 'Europa/Zürich' },
  { value: 'Europe/London', label: 'Europa/London' },
  { value: 'UTC', label: 'UTC' },
];

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'CHF', label: 'CHF Schweizer Franken' },
  { value: 'GBP', label: '£ Pfund (GBP)' },
  { value: 'USD', label: '$ US-Dollar (USD)' },
];

export const EXPORT_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'txt', label: 'Text' },
  { value: 'json', label: 'JSON' },
];

/**
 * Resolves the *effective* settings for a group by layering its own overrides on
 * top of the global defaults. Any unset group field inherits from {@link AppSettings}.
 */
export function effectiveGroupSettings(
  group: Pick<Group, 'color' | 'settings'>,
  defaults: AppSettings
): Required<Omit<GroupSettings, 'logo'>> & { logo?: string; color: string } {
  const s = group.settings ?? {};
  return {
    color: group.color || defaults.default_color,
    logo: s.logo,
    language: s.language || defaults.default_language,
    timezone: s.timezone || defaults.default_timezone,
    currency: s.currency || defaults.default_currency,
    order_deadline: s.order_deadline || defaults.default_order_deadline,
    default_export: (s.default_export || defaults.default_export) as ExportFormat,
  };
}

/**
 * Returns true if setting `newParentId` as the parent of `groupId` would create
 * a cycle (the new parent is the group itself or one of its descendants).
 */
export function wouldCreateCycle(
  groups: Pick<Group, 'id' | 'parent_group'>[],
  groupId: string,
  newParentId: string | null | undefined
): boolean {
  if (!newParentId) return false;
  if (newParentId === groupId) return true;

  const byId = new Map(groups.map(g => [g.id, g]));
  // Walk up from the candidate parent; if we reach groupId, it's a cycle.
  let current = byId.get(newParentId);
  const seen = new Set<string>();
  while (current) {
    if (current.id === groupId) return true;
    if (seen.has(current.id)) break; // defensive: pre-existing cycle
    seen.add(current.id);
    current = current.parent_group ? byId.get(current.parent_group) : undefined;
  }
  return false;
}

/** Ordered list of a group's ancestors (root-last → nearest parent last). */
export function groupAncestry(
  groups: Pick<Group, 'id' | 'name' | 'parent_group'>[],
  groupId: string
): Pick<Group, 'id' | 'name' | 'parent_group'>[] {
  const byId = new Map(groups.map(g => [g.id, g]));
  const chain: Pick<Group, 'id' | 'name' | 'parent_group'>[] = [];
  const seen = new Set<string>();
  let current = byId.get(groupId);
  while (current?.parent_group) {
    const parent = byId.get(current.parent_group);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}
