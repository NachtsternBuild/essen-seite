// ─── Domain Types ────────────────────────────────────────────────────────────

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

// ─── Auth / User Types ────────────────────────────────────────────────────────

/** Shape of the PocketBase auth record (users collection, auth-type) */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_superuser: boolean;
  info?: string;
  created?: string;
  updated?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type ViewType = "current" | "archive" | "users" | "upcoming";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface MaintenanceInfo {
  hoursUntil: number;
  duration: string;
  isUrgent: boolean;
}
