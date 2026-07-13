import type { TrashEntry } from '../types';

/** Human-friendly labels for the source collection of a trashed record. */
export const TRASH_COLLECTION_LABEL: Record<string, string> = {
  meal_plans: 'Essensplan',
  groups: 'Gruppe',
  orders: 'Bestellung',
  users: 'Benutzer',
  shared_plans: 'Vorlage',
  roles: 'Rolle',
};

export function trashCollectionLabel(collection: string): string {
  return TRASH_COLLECTION_LABEL[collection] ?? collection;
}

/**
 * Best-effort human descriptor for a trashed record, derived from its snapshot.
 * Falls back to the original record id when no friendly field is present.
 */
export function describeTrashEntry(entry: TrashEntry): string {
  const d = entry.data as Record<string, unknown>;
  if (typeof d.name === 'string' && d.name) return d.name;
  if (typeof d.user_name === 'string' && d.user_name) {
    return `${d.user_name}${typeof d.day === 'string' ? ` · ${d.day}` : ''}`;
  }
  if (typeof d.meal_name === 'string' && d.meal_name) return d.meal_name;
  if (d.week_number != null) {
    return `KW ${String(d.week_number)} / ${String(d.year ?? '')}`.trim();
  }
  return entry.record_id;
}
