import { repositories } from '../repositories';
import type {
  Group,
  GroupMembership,
  GroupWithStats,
  AuthUser,
  GroupExport,
  GroupSettings,
} from '../types';
import type { GroupInput } from '../lib/validation';

const groups = repositories.groups;
const memberships = repositories.groupMemberships;
const mealPlans = repositories.mealPlans;
const orders = repositories.orders;
const users = repositories.users;

export const groupService = {
  async getAll(): Promise<Group[]> {
    return groups.getFullList({ sort: 'name' });
  },

  async getById(id: string): Promise<Group> {
    return groups.getOne(id);
  },

  async create(data: GroupInput): Promise<Group> {
    return groups.create({
      name: data.name,
      description: data.description ?? '',
      color: data.color ?? '#d97706',
      linked_group: data.linked_group ?? null,
      parent_group: data.parent_group ?? null,
      archived: data.archived ?? false,
      settings: data.settings ?? {},
    });
  },

  async update(id: string, data: Partial<GroupInput>): Promise<Group> {
    return groups.update(id, data);
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async setArchived(id: string, archived: boolean): Promise<Group> {
    return groups.update(id, { archived });
  },

  async setParent(id: string, parentId: string | null): Promise<Group> {
    return groups.update(id, { parent_group: parentId ?? null });
  },

  /**
   * Clones a group's *configuration* (name, description, color, settings,
   * parent) into a new independent group. Members, plans and orders are not
   * copied — use export/import for full portability.
   */
  async clone(source: Group, newName: string): Promise<Group> {
    return groups.create({
      name: newName,
      description: source.description ?? '',
      color: source.color ?? '#d97706',
      parent_group: source.parent_group ?? null,
      linked_group: null,
      archived: false,
      settings: (source.settings ?? {}) as GroupSettings,
    });
  },

  /** Builds a portable snapshot of a group's config plus its meal plans. */
  async exportGroup(id: string): Promise<GroupExport> {
    const group = await groups.getOne(id);
    const plans = await mealPlans.getFullList({
      filter: `group = "${id}"`,
      sort: '-year,-week_number',
    });
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      group: {
        name: group.name,
        description: group.description ?? '',
        color: group.color ?? '#d97706',
        settings: group.settings ?? {},
      },
      meal_plans: plans.map(p => ({
        year: p.year,
        week_number: p.week_number,
        status: p.status,
        meals: p.meals ?? {},
      })),
    };
  },

  /** Re-creates a group (and its meal plans) from an exported snapshot. */
  async importGroup(data: GroupExport, nameOverride?: string): Promise<Group> {
    const group = await groups.create({
      name: nameOverride ?? data.group.name,
      description: data.group.description ?? '',
      color: data.group.color ?? '#d97706',
      settings: data.group.settings ?? {},
      archived: false,
      linked_group: null,
      parent_group: null,
    });

    await Promise.all(
      (data.meal_plans ?? []).map(p =>
        mealPlans.create({
          group: group.id,
          year: p.year,
          week_number: p.week_number,
          status: p.status,
          meals: p.meals ?? {},
        })
      )
    );

    return group;
  },

  async deleteWithCascade(id: string): Promise<void> {
    // 1. Delete all orders for each plan belonging to this group
    const plans = await mealPlans.getFullList({ filter: `group = "${id}"`, fields: 'id' });

    await Promise.all(
      plans.map(async plan => {
        const planOrders = await orders.getFullList({
          filter: `meal_plan = "${plan.id}"`,
          fields: 'id',
        });
        await Promise.all(planOrders.map(o => orders.delete(o.id)));
      })
    );

    // 2. Delete all meal plans
    await Promise.all(plans.map(p => mealPlans.delete(p.id)));

    // 3. Delete all group memberships
    const groupMemberships = await memberships.getFullList({
      filter: `group = "${id}"`,
      fields: 'id',
    });
    await Promise.all(groupMemberships.map(m => memberships.delete(m.id)));

    // 4. Unassign users (clear group_id)
    const usersInGroup = await users.getFullList({
      filter: `group_id = "${id}"`,
      fields: 'id',
    });
    await Promise.all(usersInGroup.map(u => users.update(u.id, { group_id: '' })));

    // 5. Delete the group itself
    await groups.delete(id);
  },

  // ── Memberships ────────────────────────────────────────────────────────────

  async getMemberships(groupId: string): Promise<GroupMembership[]> {
    return memberships.getFullList({ filter: `group = "${groupId}"`, expand: 'user' });
  },

  async getUserMembership(userId: string): Promise<GroupMembership | null> {
    return memberships.getFirst(`user = "${userId}"`, { expand: 'group' });
  },

  async getUserMemberships(userId: string): Promise<GroupMembership[]> {
    return memberships.getFullList({ filter: `user = "${userId}"`, expand: 'group' });
  },

  async addMember(
    groupId: string,
    userId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<GroupMembership> {
    const membership = await memberships.create({
      group: groupId,
      user: userId,
      role,
    });
    // Set the user's primary group_id when unset, so the group_id-based access
    // rules (orders/meal_plans/trash/…) grant this member access to the group.
    try {
      const user = await users.getOne(userId);
      if (!user.group_id) await users.update(userId, { group_id: groupId });
    } catch {
      // non-fatal: membership still created
    }
    return membership;
  },

  async updateMemberRole(
    membershipId: string,
    role: 'admin' | 'member'
  ): Promise<GroupMembership> {
    return memberships.update(membershipId, { role });
  },

  async removeMember(membershipId: string): Promise<void> {
    await memberships.delete(membershipId);
  },

  async moveMember(userId: string, targetGroupId: string): Promise<void> {
    const membership = await groupService.getUserMembership(userId);
    if (membership) {
      await memberships.update(membership.id, { group: targetGroupId });
    } else {
      await groupService.addMember(targetGroupId, userId);
    }
    // Keep the primary group_id in sync so access rules follow the move.
    await users.update(userId, { group_id: targetGroupId });
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getGroupsWithStats(groupList: Group[]): Promise<GroupWithStats[]> {
    return Promise.all(
      groupList.map(async group => {
        try {
          const groupMemberships = await groupService.getMemberships(group.id);
          const admins = groupMemberships
            .filter(m => m.role === 'admin' && m.expand?.user)
            .map(m => m.expand!.user!.name);

          // Union of membership user IDs and users with group_id to get unique member count.
          // Both sources can have entries the other lacks (e.g. users added directly via admin UI).
          const uniqueUserIds = new Set<string>(groupMemberships.map(m => m.user));
          try {
            const usersInGroup = await users.getFullList({
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
    const match = await memberships.getFirst(
      `user = "${userId}" && group = "${groupId}" && role = "admin"`
    );
    return match !== null;
  },

  groupIdForUser(user: AuthUser | null): string | null {
    return user?.group_id ?? null;
  },
};
