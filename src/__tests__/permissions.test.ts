import { describe, it, expect } from 'vitest';
import {
  resolvePermissions,
  hasPermission,
  ALL_PERMISSIONS,
  STANDARD_ROLES,
} from '../lib/permissions';
import type { AuthUser, Role } from '../types';

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    email: 'a@b.c',
    name: 'Test',
    is_admin: false,
    is_superuser: false,
    ...overrides,
  };
}

describe('resolvePermissions – backward compatibility', () => {
  it('grants every permission to a superuser', () => {
    const perms = resolvePermissions(makeUser({ is_superuser: true }));
    expect(perms.size).toBe(ALL_PERMISSIONS.length);
    expect(hasPermission(perms, 'SYSTEM_SETTINGS')).toBe(true);
    expect(hasPermission(perms, 'DELETE_GROUPS')).toBe(true);
  });

  it('grants group-admin defaults to a legacy is_admin user', () => {
    const perms = resolvePermissions(makeUser({ is_admin: true }));
    expect(hasPermission(perms, 'CREATE_USERS')).toBe(true);
    expect(hasPermission(perms, 'EDIT_MEALS')).toBe(true);
    // but never system-level capabilities
    expect(hasPermission(perms, 'SYSTEM_SETTINGS')).toBe(false);
    expect(hasPermission(perms, 'DELETE_GROUPS')).toBe(false);
  });

  it('grants only user defaults to a plain user', () => {
    const perms = resolvePermissions(makeUser());
    expect(hasPermission(perms, 'VIEW_MEALS')).toBe(true);
    expect(hasPermission(perms, 'PLACE_ORDERS')).toBe(true);
    expect(hasPermission(perms, 'EDIT_MEALS')).toBe(false);
    expect(hasPermission(perms, 'VIEW_USERS')).toBe(false);
  });

  it('returns an empty set for an anonymous (null) user', () => {
    expect(resolvePermissions(null).size).toBe(0);
  });
});

describe('resolvePermissions – assigned DB role', () => {
  const customRole: Role = {
    id: 'r1',
    name: 'Kassenwart',
    slug: 'kassenwart',
    permissions: ['VIEW_STATISTICS', 'EXPORT_DATA'],
    is_system: false,
  };

  it('uses the assigned role permissions over legacy flags', () => {
    const perms = resolvePermissions(makeUser({ role: 'r1' }), [customRole]);
    expect(hasPermission(perms, 'VIEW_STATISTICS')).toBe(true);
    expect(hasPermission(perms, 'EXPORT_DATA')).toBe(true);
    expect(hasPermission(perms, 'PLACE_ORDERS')).toBe(false);
  });

  it('falls back to legacy flags when the assigned role is not loaded', () => {
    const perms = resolvePermissions(makeUser({ role: 'missing', is_admin: true }), [customRole]);
    expect(hasPermission(perms, 'CREATE_USERS')).toBe(true);
  });

  it('superuser flag still wins even with a restrictive role assigned', () => {
    const perms = resolvePermissions(
      makeUser({ role: 'r1', is_superuser: true }),
      [customRole]
    );
    expect(perms.size).toBe(ALL_PERMISSIONS.length);
  });
});

describe('STANDARD_ROLES catalog integrity', () => {
  it('every standard role permission exists in the catalog', () => {
    for (const role of Object.values(STANDARD_ROLES)) {
      for (const p of role.permissions) {
        expect(ALL_PERMISSIONS).toContain(p);
      }
    }
  });
});
