// ─── String union types ───────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin' | 'superuser';
export type WeekStatus = 'upcoming' | 'current' | 'archived';
export type SyncMode = 'copy' | 'sync';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAYS_OF_WEEK = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export const ALLERGENS: Record<string, string> = {
  A: 'Gluten',
  B: 'Krebstiere',
  C: 'Eier',
  D: 'Fisch',
  E: 'Erdnüsse',
  F: 'Soja',
  G: 'Milch/Laktose',
  H: 'Schalenfrüchte',
  L: 'Sellerie',
  M: 'Senf',
  N: 'Sesam',
  O: 'Schwefeldioxid/Sulfite',
  P: 'Lupinen',
  R: 'Weichtiere',
};

// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_superuser: boolean;
  info?: string;
  group_id?: string;
  created?: string;
  updated?: string;
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  linked_group?: string;
  created: string;
  updated: string;
}

export interface GroupMembership {
  id: string;
  group: string;
  user: string;
  role: 'admin' | 'member';
  expand?: {
    user?: AuthUser;
    group?: Group;
  };
}

export interface GroupWithStats extends Group {
  memberCount: number;
  adminNames: string[];
  orderCount: number;
}

// ─── Meals ───────────────────────────────────────────────────────────────────

export interface MealItem {
  number: string;
  name: string;
  price: number;
  vegetarian?: boolean;
  vegan?: boolean;
  allergens?: string[];
  additives?: string[];
}

export interface DayMeals {
  [day: string]: MealItem[];
}

export interface MealPlan {
  id: string;
  group: string;
  year: number;
  week_number: number;
  status: WeekStatus;
  meals: DayMeals;
  synced_from?: string;
  sync_mode?: SyncMode;
  created: string;
  updated: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  meal_plan: string;
  group: string;
  user: string;
  user_name: string;
  user_info?: string;
  day: DayOfWeek;
  meal_number: string;
  meal_name: string;
  meal_price: number;
  edited: boolean;
  created: string;
  updated: string;
}

export interface OrdersByUser {
  [userName: string]: {
    [day: string]: {
      id: string;
      meal_number: string;
      meal_name: string;
      meal_price: number;
      edited: boolean;
    };
  };
}

// ─── Shared Plans ─────────────────────────────────────────────────────────────

export interface SharedPlan {
  id: string;
  source_plan: string;
  source_group: string;
  source_group_name: string;
  shared_by: string;
  shared_by_name: string;
  name: string;
  description?: string;
  week_label: string;
  meals: DayMeals;
  created: string;
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export interface MaintenanceSettings {
  id?: string;
  active: boolean;
  start_time: string;
  duration: string;
  message?: string;
}

export interface MaintenanceInfo {
  hoursUntil: number;
  duration: string;
  isUrgent: boolean;
  message?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type ViewType =
  | 'current'
  | 'upcoming'
  | 'archive'
  | 'users'
  | 'groups'
  | 'stats'
  | 'shared-plans';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// ─── Legacy compat (for transition period) ───────────────────────────────────

export interface Meal {
  name: string;
  price: string | number;
  number: string;
  edited?: boolean;
}

export interface Orders {
  [name: string]: { [day: string]: Meal };
}

export interface MealsState {
  [day: string]: Meal[];
}

export interface WeekData {
  meals: MealsState;
  orders: Orders;
}

export interface AppData {
  upcoming: WeekData;
  current: WeekData;
  previous: WeekData | null;
  maintenance_active?: boolean;
  maintenance_start?: string;
  maintenance_duration?: string;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportFormat = 'txt' | 'csv' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  label: string;
  weekData: WeekData;
  groupName?: string;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface MealStat {
  number: string;
  name: string;
  count: number;
  revenue: number;
}

export interface WeekStats {
  totalOrders: number;
  totalRevenue: number;
  popularMeals: MealStat[];
  ordersByDay: Record<string, number>;
  averagePerPerson: number;
}
