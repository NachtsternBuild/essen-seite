import { COLLECTIONS } from '../lib/pocketbase';
import { BaseRepository } from './baseRepository';
import type {
  AuthUser,
  Group,
  GroupMembership,
  MealPlan,
  Order,
  SharedPlan,
  Role,
  AuditLog,
  TrashEntry,
  PlanHistoryEntry,
  Notification,
} from '../types';

/**
 * Central registry of repositories. Services import from here instead of
 * constructing PocketBase collection accessors themselves, giving the app one
 * typed data-access surface.
 *
 * Generic/untyped collections (e.g. key/value `settings`) are accessed via
 * BaseRepository directly inside their owning service.
 */
export const repositories = {
  users: new BaseRepository<AuthUser>(COLLECTIONS.USERS),
  groups: new BaseRepository<Group>(COLLECTIONS.GROUPS),
  groupMemberships: new BaseRepository<GroupMembership>(COLLECTIONS.GROUP_MEMBERSHIPS),
  mealPlans: new BaseRepository<MealPlan>(COLLECTIONS.MEAL_PLANS),
  orders: new BaseRepository<Order>(COLLECTIONS.ORDERS),
  sharedPlans: new BaseRepository<SharedPlan>(COLLECTIONS.SHARED_PLANS),
  roles: new BaseRepository<Role>(COLLECTIONS.ROLES),
  auditLogs: new BaseRepository<AuditLog>(COLLECTIONS.AUDIT_LOGS),
  trash: new BaseRepository<TrashEntry>(COLLECTIONS.TRASH),
  planHistory: new BaseRepository<PlanHistoryEntry>(COLLECTIONS.PLAN_HISTORY),
  notifications: new BaseRepository<Notification>(COLLECTIONS.NOTIFICATIONS),
} as const;

export { BaseRepository } from './baseRepository';
export type { ListOptions } from './baseRepository';
