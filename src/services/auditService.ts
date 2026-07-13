import { repositories } from '../repositories';
import type { AuditAction, AuditLog, AuthUser } from '../types';

const auditLogs = repositories.auditLogs;

export interface AuditEntryInput {
  user?: AuthUser | null;
  action: AuditAction;
  entity_type?: string;
  entity_id?: string;
  group?: string;
  details?: Record<string, unknown>;
}

export const auditService = {
  /**
   * Records an audit entry. Logging is best-effort and must never disrupt the
   * primary user action, so all errors are swallowed (and surfaced only to the
   * console in dev).
   */
  async log(entry: AuditEntryInput): Promise<void> {
    try {
      await auditLogs.create({
        user: entry.user?.id ?? null,
        user_name: entry.user?.name ?? 'System',
        action: entry.action,
        entity_type: entry.entity_type ?? '',
        entity_id: entry.entity_id ?? '',
        group: entry.group ?? null,
        details: entry.details ?? {},
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[audit] failed to write log:', err);
    }
  },

  logLogin(user: AuthUser): Promise<void> {
    return auditService.log({ user, action: 'login' });
  },

  logLogout(user: AuthUser): Promise<void> {
    return auditService.log({ user, action: 'logout' });
  },

  async list(limit = 200): Promise<AuditLog[]> {
    const res = await auditLogs.getList(1, limit, { sort: '-created' });
    return res.items;
  },

  async listForGroup(groupId: string, limit = 200): Promise<AuditLog[]> {
    const res = await auditLogs.getList(1, limit, {
      filter: `group = "${groupId}"`,
      sort: '-created',
    });
    return res.items;
  },
};
