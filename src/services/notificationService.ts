import { repositories } from '../repositories';
import type { Notification, NotificationType } from '../types';

const notifications = repositories.notifications;
const memberships = repositories.groupMemberships;
const users = repositories.users;

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message?: string;
  group?: string;
}

export const notificationService = {
  /** Creates a single notification for one user. Best-effort. */
  async notifyUser(userId: string, input: NotificationInput): Promise<void> {
    try {
      await notifications.create({
        user: userId,
        group: input.group ?? null,
        type: input.type,
        title: input.title,
        message: input.message ?? '',
        read: false,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[notify] failed:', err);
    }
  },

  /**
   * Fan-out: notifies every member of a group (union of formal memberships and
   * users whose primary group_id matches). Best-effort and de-duplicated.
   */
  async notifyGroup(
    groupId: string,
    input: NotificationInput,
    excludeUserId?: string
  ): Promise<void> {
    try {
      const ids = new Set<string>();
      const [ms, gu] = await Promise.all([
        memberships.getFullList({ filter: `group = "${groupId}"`, fields: 'user' }),
        users.getFullList({ filter: `group_id = "${groupId}"`, fields: 'id' }),
      ]);
      ms.forEach(m => m.user && ids.add(m.user));
      gu.forEach(u => ids.add(u.id));
      if (excludeUserId) ids.delete(excludeUserId);

      await Promise.all(
        [...ids].map(id => notificationService.notifyUser(id, { ...input, group: groupId }))
      );
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[notify-group] failed:', err);
    }
  },

  async listForUser(userId: string, limit = 50): Promise<Notification[]> {
    const res = await notifications.getList(1, limit, {
      filter: `user = "${userId}"`,
      sort: '-created',
    });
    return res.items;
  },

  async unreadCountForUser(userId: string): Promise<number> {
    const res = await notifications.getList(1, 1, {
      filter: `user = "${userId}" && read = false`,
    });
    return res.totalItems;
  },

  async markRead(id: string): Promise<void> {
    await notifications.update(id, { read: true });
  },

  async markAllRead(userId: string): Promise<void> {
    const unread = await notifications.getFullList({
      filter: `user = "${userId}" && read = false`,
      fields: 'id',
    });
    await Promise.all(unread.map(n => notifications.update(n.id, { read: true })));
  },

  async remove(id: string): Promise<void> {
    await notifications.delete(id);
  },
};
