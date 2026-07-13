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
  /**
   * Optional reference to a {@link Role} in the `roles` collection. When set,
   * it is the primary source of the user's permissions. When unset, permissions
   * fall back to the legacy is_admin/is_superuser flags so existing accounts
   * keep working unchanged.
   */
  role?: string;
  created?: string;
  updated?: string;
}

// ─── Roles & Permissions ───────────────────────────────────────────────────────

/**
 * A single capability. The authoritative catalog lives in `lib/permissions.ts`;
 * this type is the string-literal union of every key in that catalog.
 */
export type Permission =
  | 'VIEW_USERS'
  | 'CREATE_USERS'
  | 'EDIT_USERS'
  | 'DELETE_USERS'
  | 'VIEW_MEALS'
  | 'EDIT_MEALS'
  | 'DELETE_MEALS'
  | 'PLACE_ORDERS'
  | 'VIEW_ORDERS'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'CREATE_GROUPS'
  | 'EDIT_GROUPS'
  | 'DELETE_GROUPS'
  | 'MANAGE_TEMPLATES'
  | 'VIEW_STATISTICS'
  | 'MANAGE_PERMISSIONS'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_TRASH'
  | 'SYSTEM_SETTINGS';

/** Slugs of the three built-in roles that always exist. */
export type StandardRoleSlug = 'user' | 'group_admin' | 'superuser';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: Permission[];
  /** System roles cannot be deleted and define the backward-compatible defaults. */
  is_system: boolean;
  /** Optional group scope. Null/empty = global role available to every group. */
  group?: string;
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
  /** Optional parent group id, enabling a nested group hierarchy. */
  parent_group?: string;
  /** Soft-archive flag (group hidden but not deleted). */
  archived?: boolean;
  /**
   * Per-group settings bag (logo, timezone, language, order deadline, …).
   * Foundation field — populated by Phase 1. See {@link GroupSettings}.
   */
  settings?: GroupSettings;
  created: string;
  updated: string;
}

/**
 * Per-group configuration. Every field is optional; unset values inherit from
 * the global {@link AppSettings} defaults. Extended in later phases.
 */
export interface GroupSettings {
  logo?: string;
  language?: string;
  timezone?: string;
  currency?: string;
  /** Daily order cut-off, "HH:MM". */
  order_deadline?: string;
  default_export?: ExportFormat;
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

/**
 * Portable snapshot of a group's configuration plus its meal plans, used by the
 * group export/import feature. Deliberately excludes user-specific data
 * (memberships, orders) so a group can be moved between installations.
 */
export interface GroupExport {
  version: 1;
  exported_at: string;
  group: {
    name: string;
    description: string;
    color: string;
    settings?: GroupSettings;
  };
  meal_plans: Array<{
    year: number;
    week_number: number;
    status: WeekStatus;
    meals: DayMeals;
  }>;
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
  /** Extended description shown when the dish is expanded (click to open). */
  description?: string;
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
  | 'dashboard'
  | 'current'
  | 'upcoming'
  | 'archive'
  | 'users'
  | 'groups'
  | 'stats'
  | 'trash'
  | 'settings'
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

// ─── Audit Log ─────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'import'
  | 'export'
  | 'permission_change'
  | 'group_create';

export interface AuditLog {
  id: string;
  user?: string;
  user_name: string;
  action: AuditAction;
  /** Collection or domain entity affected, e.g. "users", "meal_plans". */
  entity_type?: string;
  entity_id?: string;
  group?: string;
  /** Free-form structured context (before/after, counts, …). */
  details?: Record<string, unknown>;
  created: string;
}

// ─── Trash (soft delete) ───────────────────────────────────────────────────────

export interface TrashEntry {
  id: string;
  /** Source collection the record was deleted from. */
  collection_name: string;
  /** Original record id, for reference / dedupe. */
  record_id: string;
  /** Full JSON snapshot used to restore the record. */
  data: Record<string, unknown>;
  deleted_by?: string;
  deleted_by_name: string;
  group?: string;
  created: string;
}

// ─── Plan history / versioning (Phase 3) ────────────────────────────────────────

export type PlanHistoryAction =
  | 'created'
  | 'meal_added'
  | 'meal_removed'
  | 'meals_updated'
  | 'status_changed';

export interface PlanHistoryEntry {
  id: string;
  meal_plan: string;
  group?: string;
  user?: string;
  user_name: string;
  action: PlanHistoryAction;
  /** Affected day, when the change is day-scoped. */
  day?: string;
  /** Human-readable one-line summary. */
  summary: string;
  /** Snapshot of the affected slice before the change. */
  before?: unknown;
  /** Snapshot after the change. */
  after?: unknown;
  created: string;
}

// ─── Notifications (Phase 3) ─────────────────────────────────────────────────────

export type NotificationType =
  | 'order_deadline'
  | 'new_week'
  | 'plan_changed'
  | 'new_group'
  | 'admin_message'
  | 'system';

export interface Notification {
  id: string;
  /** Recipient user. Empty = broadcast handled at creation time (one row per user). */
  user?: string;
  group?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created: string;
}

// ─── Global App Settings ───────────────────────────────────────────────────────

/**
 * System-wide defaults configured by the superuser. New groups inherit these
 * unless overridden in their own {@link GroupSettings}.
 */
export interface AppSettings {
  default_color: string;
  default_language: string;
  default_timezone: string;
  default_currency: string;
  default_order_deadline: string;
  default_export: ExportFormat;
  default_theme: ThemeMode;
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

// ─── Statistics suite (Phase 2) ────────────────────────────────────────────────

export interface DietStat {
  vegetarian: number;
  vegan: number;
  other: number;
  total: number;
}

export interface AllergenStat {
  code: string;
  label: string;
  count: number;
}

/** One point in a weekly time series (orders/revenue per calendar week). */
export interface TrendPoint {
  label: string;
  year: number;
  week: number;
  orders: number;
  revenue: number;
}

export interface GroupComparisonRow {
  groupId: string;
  groupName: string;
  orders: number;
  revenue: number;
  users: number;
}

/** Full statistics snapshot for a group (or the whole system). */
export interface Statistics {
  totalOrders: number;
  totalRevenue: number;
  uniqueUsers: number;
  averagePerOrder: number;
  popularMeals: MealStat[];
  ordersByDay: Record<string, number>;
  diet: DietStat;
  allergens: AllergenStat[];
  trend: TrendPoint[];
}

/** Lightweight summary of a single week's OrdersByUser, used by dashboards. */
export interface OrdersSummary {
  orders: number;
  revenue: number;
  participants: number;
  topMeal?: { number: string; name: string; count: number };
}
