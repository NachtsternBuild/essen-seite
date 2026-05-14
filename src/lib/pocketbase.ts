import PocketBase from 'pocketbase';

export const pb = new PocketBase(
  import.meta.env.DEV ? 'http://127.0.0.1:8090' : undefined
);

export const COLLECTION_NAME = 'meals_data';
export const USER_COLLECTION = 'users'; // PocketBase built-in auth collection

export const DAYS_OF_WEEK = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];
