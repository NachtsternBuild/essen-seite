import type { Permission, Role, StandardRoleSlug, AuthUser } from '../types';

/**
 * Authoritative permission catalog. Each entry pairs a permission key with a
 * human-readable German label and a category, so the settings UI can render a
 * grouped checklist without hard-coding strings elsewhere.
 *
 * This is the single source of truth: the {@link Permission} union in
 * `types/index.ts` must stay in sync with the keys here.
 */
export const PERMISSION_CATALOG: Record<
  Permission,
  { label: string; category: string }
> = {
  VIEW_USERS: { label: 'Benutzer ansehen', category: 'Benutzer' },
  CREATE_USERS: { label: 'Benutzer erstellen', category: 'Benutzer' },
  EDIT_USERS: { label: 'Benutzer bearbeiten', category: 'Benutzer' },
  DELETE_USERS: { label: 'Benutzer löschen', category: 'Benutzer' },

  VIEW_MEALS: { label: 'Essenspläne ansehen', category: 'Essenspläne' },
  EDIT_MEALS: { label: 'Essenspläne bearbeiten', category: 'Essenspläne' },
  DELETE_MEALS: { label: 'Essenspläne löschen', category: 'Essenspläne' },
  MANAGE_TEMPLATES: { label: 'Vorlagen verwalten', category: 'Essenspläne' },

  PLACE_ORDERS: { label: 'Bestellungen aufgeben', category: 'Bestellungen' },
  VIEW_ORDERS: { label: 'Alle Bestellungen ansehen', category: 'Bestellungen' },

  EXPORT_DATA: { label: 'Daten exportieren', category: 'Daten' },
  IMPORT_DATA: { label: 'Daten importieren', category: 'Daten' },
  VIEW_STATISTICS: { label: 'Statistiken ansehen', category: 'Daten' },

  CREATE_GROUPS: { label: 'Gruppen erstellen', category: 'Gruppen' },
  EDIT_GROUPS: { label: 'Gruppen bearbeiten', category: 'Gruppen' },
  DELETE_GROUPS: { label: 'Gruppen löschen', category: 'Gruppen' },

  MANAGE_PERMISSIONS: { label: 'Rollen & Rechte verwalten', category: 'System' },
  VIEW_AUDIT_LOG: { label: 'Audit-Log einsehen', category: 'System' },
  MANAGE_TRASH: { label: 'Papierkorb verwalten', category: 'System' },
  SYSTEM_SETTINGS: { label: 'Systemeinstellungen', category: 'System' },
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_CATALOG) as Permission[];

// ─── Standard role permission sets ──────────────────────────────────────────────
// These are the backward-compatible defaults. They mirror what is_admin /
// is_superuser granted before, expressed as explicit permissions.

const USER_PERMISSIONS: Permission[] = ['VIEW_MEALS', 'PLACE_ORDERS'];

const GROUP_ADMIN_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  'VIEW_USERS',
  'CREATE_USERS',
  'EDIT_USERS',
  'DELETE_USERS',
  'EDIT_MEALS',
  'DELETE_MEALS',
  'MANAGE_TEMPLATES',
  'VIEW_ORDERS',
  'EXPORT_DATA',
  'IMPORT_DATA',
  'VIEW_STATISTICS',
];

// Superuser implicitly holds every permission.
const SUPERUSER_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];

/** Definitions used to seed the `roles` collection and as code-level fallback. */
export const STANDARD_ROLES: Record<
  StandardRoleSlug,
  { name: string; description: string; permissions: Permission[] }
> = {
  user: {
    name: 'Benutzer',
    description: 'Kann Essenspläne ansehen und eigene Bestellungen aufgeben.',
    permissions: USER_PERMISSIONS,
  },
  group_admin: {
    name: 'Gruppenadministrator',
    description: 'Verwaltet Benutzer, Essenspläne und Bestellungen der eigenen Gruppe.',
    permissions: GROUP_ADMIN_PERMISSIONS,
  },
  superuser: {
    name: 'Superuser',
    description: 'Volle Kontrolle über das gesamte System.',
    permissions: SUPERUSER_PERMISSIONS,
  },
};

/**
 * Resolves the effective permission set for a user.
 *
 * Resolution order (first match wins):
 *  1. Superusers always hold every permission.
 *  2. An explicitly assigned DB role (looked up in `roles`) defines the set.
 *  3. Otherwise fall back to the legacy flags: is_admin → group-admin defaults,
 *     plain user → user defaults.
 *
 * This guarantees existing accounts behave exactly as before until a custom
 * role is assigned, satisfying the "don't break existing flows" constraint.
 */
export function resolvePermissions(
  user: AuthUser | null,
  roles: Role[] = []
): Set<Permission> {
  if (!user) return new Set();
  if (user.is_superuser) return new Set(SUPERUSER_PERMISSIONS);

  if (user.role) {
    const assigned = roles.find(r => r.id === user.role);
    if (assigned) return new Set(assigned.permissions);
  }

  return new Set(user.is_admin ? GROUP_ADMIN_PERMISSIONS : USER_PERMISSIONS);
}

/** Convenience predicate used by `usePermissions` and guards. */
export function hasPermission(
  permissions: Set<Permission>,
  required: Permission
): boolean {
  return permissions.has(required);
}
