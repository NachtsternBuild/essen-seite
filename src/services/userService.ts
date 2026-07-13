import { repositories } from '../repositories';
import type { AuthUser } from '../types';
import type { CreateUserInput } from '../lib/validation';

const users = repositories.users;

export const userService = {
  async getAll(): Promise<AuthUser[]> {
    return users.getFullList({ sort: 'name' });
  },

  async getById(id: string): Promise<AuthUser> {
    return users.getOne(id);
  },

  async create(data: CreateUserInput): Promise<AuthUser> {
    return users.create({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      emailVisibility: true,
      is_admin: data.is_admin ?? false,
      info: data.info ?? '',
    });
  },

  async update(
    id: string,
    data: Partial<Omit<AuthUser, 'id' | 'email' | 'created' | 'updated'>>
  ): Promise<AuthUser> {
    return users.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await users.delete(id);
  },

  async updateInfo(id: string, info: string): Promise<AuthUser> {
    return users.update(id, { info });
  },

  async updateGroupId(id: string, groupId: string): Promise<AuthUser> {
    return users.update(id, { group_id: groupId });
  },

  async toggleAdmin(id: string, value: boolean): Promise<AuthUser> {
    return users.update(id, { is_admin: value });
  },

  /** Assigns a role (from the `roles` collection) to a user. */
  async assignRole(id: string, roleId: string | null): Promise<AuthUser> {
    return users.update(id, { role: roleId ?? '' });
  },

  async resetPassword(id: string, newPassword: string): Promise<AuthUser> {
    return users.update(id, {
      password: newPassword,
      passwordConfirm: newPassword,
    });
  },

  async getUsersInGroup(groupId: string): Promise<AuthUser[]> {
    return users.getFullList({ filter: `group_id = "${groupId}"`, sort: 'name' });
  },

  canDelete(target: AuthUser, actor: AuthUser | null): boolean {
    if (!actor) return false;
    if (target.is_superuser) return false;
    if (actor.is_superuser) return true;
    if (target.is_admin) return false;
    return actor.is_admin;
  },

  canManage(target: AuthUser, actor: AuthUser | null): boolean {
    if (!actor) return false;
    if (actor.is_superuser) return true;
    if (target.is_superuser) return false;
    return actor.is_admin;
  },
};
