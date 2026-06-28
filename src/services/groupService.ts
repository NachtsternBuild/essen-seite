import { pb, COLLECTIONS } from '../lib/pocketbase';
import type { Group, GroupMembership, GroupWithStats, AuthUser } from '../types';
import type { GroupInput } from '../lib/validation';

export const groupService = {
  async getAll(): Promise<Group[]> {
    return pb.collection(COLLECTIONS.GROUPS).getFullList<Group>({
      sort: 'name',
      filter: 'archived = false',
    });
  },

  async getAllIncludingArchived(): Promise<Group[]> {
    return pb.collection(COLLECTIONS.GROUPS).getFullList<Group>({
      sort: 'name',
    });
  },

  async getById(id: string): Promise<Group> {
    return pb.collection(COLLECTIONS.GROUPS).getOne<Group>(id);
  },

  async create(data: GroupInput): Promise<Group> {
    return pb.collection(COLLECTIONS.GROUPS).create<Group>({
      name: data.name,
      description: data.description ?? '',
      color: data.color ?? '#d97706',
      archived: false,
      linked_group: data.linked_group ?? null,
    });
  },

  async update(id: string, data: Partial<GroupInput & { archived: boolean }>): Promise<Group> {
    return pb.collection(COLLECTIONS.GROUPS).update<Group>(id, data);
  },

  async delete(id: string): Promise<void> {
    await pb.collection(COLLECTIONS.GROUPS).delete(id);
  },

  async archive(id: string): Promise<Group> {
    return pb.collection(COLLECTIONS.GROUPS).update<Group>(id, { archived: true });
  },

  async unarchive(id: string): Promise<Group> {
    return pb.collection(COLLECTIONS.GROUPS).update<Group>(id, { archived: false });
  },

  // ── Memberships ────────────────────────────────────────────────────────────

  async getMemberships(groupId: string): Promise<GroupMembership[]> {
    return pb.collection(COLLECTIONS.GROUP_MEMBERSHIPS).getFullList<GroupMembership>({
      filter: `group = "${groupId}"`,
      expand: 'user',
    });
  },

  async getUserMembership(userId: string): Promise<GroupMembership | null> {
    try {
      const results = await pb
        .collection(COLLECTIONS.GROUP_MEMBERSHIPS)
        .getFullList<GroupMembership>({
          filter: `user = "${userId}"`,
          expand: 'group',
        });
      return results[0] ?? null;
    } catch {
      return null;
    }
  },

  async getUserMemberships(userId: string): Promise<GroupMembership[]> {
    return pb.collection(COLLECTIONS.GROUP_MEMBERSHIPS).getFullList<GroupMembership>({
      filter: `user = "${userId}"`,
      expand: 'group',
    });
  },

  async addMember(
    groupId: string,
    userId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<GroupMembership> {
    return pb.collection(COLLECTIONS.GROUP_MEMBERSHIPS).create<GroupMembership>({
      group: groupId,
      user: userId,
      role,
    });
  },

  async updateMemberRole(
    membershipId: string,
    role: 'admin' | 'member'
  ): Promise<GroupMembership> {
    return pb
      .collection(COLLECTIONS.GROUP_MEMBERSHIPS)
      .update<GroupMembership>(membershipId, { role });
  },

  async removeMember(membershipId: string): Promise<void> {
    await pb.collection(COLLECTIONS.GROUP_MEMBERSHIPS).delete(membershipId);
  },

  async moveMember(userId: string, targetGroupId: string): Promise<void> {
    const membership = await groupService.getUserMembership(userId);
    if (membership) {
      await pb
        .collection(COLLECTIONS.GROUP_MEMBERSHIPS)
        .update(membership.id, { group: targetGroupId });
    } else {
      await groupService.addMember(targetGroupId, userId);
    }
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getGroupsWithStats(groups: Group[]): Promise<GroupWithStats[]> {
    return Promise.all(
      groups.map(async group => {
        try {
          const [memberships, userPage] = await Promise.all([
            groupService.getMemberships(group.id),
            pb.collection(COLLECTIONS.USERS).getList(1, 1, {
              filter: `group_id = "${group.id}"`,
              fields: 'id',
            }),
          ]);
          const admins = memberships
            .filter(m => m.role === 'admin' && m.expand?.user)
            .map(m => m.expand!.user!.name);

          // Use whichever source reports more members
          const memberCount = Math.max(memberships.length, userPage.totalItems);

          return { ...group, memberCount, adminNames: admins, orderCount: 0 };
        } catch {
          return { ...group, memberCount: 0, adminNames: [], orderCount: 0 };
        }
      })
    );
  },

  async isAdminInGroup(userId: string, groupId: string): Promise<boolean> {
    try {
      const results = await pb
        .collection(COLLECTIONS.GROUP_MEMBERSHIPS)
        .getFullList<GroupMembership>({
          filter: `user = "${userId}" && group = "${groupId}" && role = "admin"`,
        });
      return results.length > 0;
    } catch {
      return false;
    }
  },

  groupIdForUser(user: AuthUser | null): string | null {
    return user?.group_id ?? null;
  },
};
