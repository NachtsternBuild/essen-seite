import { pb, COLLECTIONS } from '../lib/pocketbase';
import type { AuthUser } from '../types';
import type { CreateUserInput } from '../lib/validation';

export const userService = {
  async getAll(): Promise<AuthUser[]> {
    return pb.collection(COLLECTIONS.USERS).getFullList<AuthUser>({
      sort: 'name',
    });
  },

  async getById(id: string): Promise<AuthUser> {
    return pb.collection(COLLECTIONS.USERS).getOne<AuthUser>(id);
  },

  async create(data: CreateUserInput): Promise<AuthUser> {
    return pb.collection(COLLECTIONS.USERS).create<AuthUser>({
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
    return pb.collection(COLLECTIONS.USERS).update<AuthUser>(id, data);
  },

  async delete(id: string): Promise<void> {
    await pb.collection(COLLECTIONS.USERS).delete(id);
  },

  async updateInfo(id: string, info: string): Promise<AuthUser> {
    return pb.collection(COLLECTIONS.USERS).update<AuthUser>(id, { info });
  },

  async updateGroupId(id: string, groupId: string): Promise<AuthUser> {
    return pb
      .collection(COLLECTIONS.USERS)
      .update<AuthUser>(id, { group_id: groupId });
  },

  async toggleAdmin(id: string, value: boolean): Promise<AuthUser> {
    return pb
      .collection(COLLECTIONS.USERS)
      .update<AuthUser>(id, { is_admin: value });
  },

  async resetPassword(id: string, newPassword: string): Promise<AuthUser> {
    return pb.collection(COLLECTIONS.USERS).update<AuthUser>(id, {
      password: newPassword,
      passwordConfirm: newPassword,
    });
  },

  async getUsersInGroup(groupId: string): Promise<AuthUser[]> {
    return pb.collection(COLLECTIONS.USERS).getFullList<AuthUser>({
      filter: `group_id = "${groupId}"`,
      sort: 'name',
    });
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
