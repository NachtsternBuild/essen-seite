import { pb, COLLECTIONS } from '../lib/pocketbase';
import type { Group, GroupMembership, GroupWithStats, AuthUser } from '../types';
import type { GroupInput } from '../lib/validation';

export const groupService = {
  async getAll(): Promise<Group[]> {
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
      linked_group: data.linked_group ?? null,
    });
  },

  async update(id: string, data: Partial<GroupInput>): Promise<Group> {
    return pb.collection(COLLECTIONS.GROUPS).update<Group>(id, data);
  },

  async deleteWithCascade(id: string): Promise<void> {
    // 1. Delete all orders for each plan belonging to this group
    const plans = await pb
      .collection(COLLECTIONS.MEAL_PLANS)
      .getFullList<{ id: string }>({ filter: `group = "${id}"`, fields: 'id' });

    await Promise.all(
      plans.map(async plan => {
        const orders = await pb
          .collection(COLLECTIONS.ORDERS)
          .getFullList<{ id: string }>({ filter: `meal_plan = "${plan.id}"`, fields: 'id' });
        await Promise.all(orders.map(o => pb.collection(COLLECTIONS.ORDERS).delete(o.id)));
      })
    );

    // 2. Delete all meal plans
    await Promise.all(plans.map(p => pb.collection(COLLECTIONS.MEAL_PLANS).delete(p.id)));

    // 3. Delete all group memberships
    const memberships = await pb
      .collection(COLLECTIONS.GROUP_MEMBERSHIPS)
      .getFullList<{ id: string }>({ filter: `group = "${id}"`, fields: 'id' });
    await Promise.all(memberships.map(m => pb.collection(COLLECTIONS.GROUP_MEMBERSHIPS).delete(m.id)));

    // 4. Unassign users (clear group_id)
    const users = await pb
      .collection(COLLECTIONS.USERS)
      .getFullList<{ id: string }>({ filter: `group_id = "${id}"`, fields: 'id' });
    await Promise.all(users.map(u => pb.collection(COLLECTIONS.USERS).update(u.id, { group_id: '' })));

    // 5. Delete the group itself
    await pb.collection(COLLECTIONS.GROUPS).delete(id);
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
          const memberships = await groupService.getMemberships(group.id);
          const admins = memberships
            .filter(m => m.role === 'admin' && m.expand?.user)
            .map(m => m.expand!.user!.name);

          // Union of membership user IDs and users with group_id to get unique member count.
          // Both sources can have entries the other lacks (e.g. users added directly via admin UI).
          const uniqueUserIds = new Set<string>(memberships.map(m => m.user));
          try {
            const usersInGroup = await pb
              .collection(COLLECTIONS.USERS)
              .getFullList<{ id: string }>({
                filter: `group_id = "${group.id}"`,
                fields: 'id',
              });
            usersInGroup.forEach(u => uniqueUserIds.add(u.id));
          } catch {
            // May fail without is_admin – membership count alone is still valid
          }

          return { ...group, memberCount: uniqueUserIds.size, adminNames: admins, orderCount: 0 };
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
