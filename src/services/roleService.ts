import { repositories } from '../repositories';
import { STANDARD_ROLES } from '../lib/permissions';
import type { Permission, Role, StandardRoleSlug } from '../types';

const roles = repositories.roles;

export interface RoleInput {
  name: string;
  slug: string;
  description?: string;
  permissions: Permission[];
  group?: string | null;
}

export const roleService = {
  async getAll(): Promise<Role[]> {
    return roles.getFullList({ sort: 'name' });
  },

  async getById(id: string): Promise<Role> {
    return roles.getOne(id);
  },

  async getBySlug(slug: string): Promise<Role | null> {
    return roles.getFirst(`slug = "${slug}"`);
  },

  async create(data: RoleInput): Promise<Role> {
    return roles.create({
      name: data.name,
      slug: data.slug,
      description: data.description ?? '',
      permissions: data.permissions,
      is_system: false,
      group: data.group ?? null,
    });
  },

  async update(id: string, data: Partial<RoleInput>): Promise<Role> {
    return roles.update(id, { ...data });
  },

  async delete(id: string): Promise<void> {
    const role = await roles.getOne(id);
    if (role.is_system) {
      throw new Error('Systemrollen können nicht gelöscht werden.');
    }
    await roles.delete(id);
  },

  /**
   * Idempotently ensures the three built-in roles exist. Safe to call on every
   * app start; only creates roles that are missing. Returns the full role list.
   */
  async ensureStandardRoles(): Promise<Role[]> {
    const existing = await roleService.getAll();
    const bySlug = new Map(existing.map(r => [r.slug, r]));

    const slugs = Object.keys(STANDARD_ROLES) as StandardRoleSlug[];
    const created = await Promise.all(
      slugs
        .filter(slug => !bySlug.has(slug))
        .map(slug => {
          const def = STANDARD_ROLES[slug];
          return roles.create({
            name: def.name,
            slug,
            description: def.description,
            permissions: def.permissions,
            is_system: true,
            group: null,
          });
        })
    );

    return [...existing, ...created];
  },
};
