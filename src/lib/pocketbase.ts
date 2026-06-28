import PocketBase from 'pocketbase';

export const pb = new PocketBase(
  import.meta.env.DEV ? 'http://127.0.0.1:8090' : undefined
);

// ─── Collection names ─────────────────────────────────────────────────────────

export const COLLECTIONS = {
  USERS: 'users',
  GROUPS: 'groups',
  GROUP_MEMBERSHIPS: 'group_memberships',
  MEAL_PLANS: 'meal_plans',
  ORDERS: 'orders',
  SHARED_PLANS: 'shared_plans',
  SETTINGS: 'settings',
  /** Legacy – single-document storage, kept for migration */
  MEALS_DATA: 'meals_data',
} as const;

/** @deprecated use COLLECTIONS instead */
export const COLLECTION_NAME = COLLECTIONS.MEALS_DATA;
/** @deprecated use COLLECTIONS.USERS instead */
export const USER_COLLECTION = COLLECTIONS.USERS;

export const DAYS_OF_WEEK = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
