import { repositories } from '../repositories';
import type { AuthUser, PlanHistoryAction, PlanHistoryEntry } from '../types';

const planHistory = repositories.planHistory;

export interface RecordHistoryInput {
  planId: string;
  group?: string;
  actor: AuthUser | null;
  action: PlanHistoryAction;
  summary: string;
  day?: string;
  before?: unknown;
  after?: unknown;
}

export const planHistoryService = {
  /**
   * Appends a history entry for a plan change. Best-effort — never throws into
   * the editing flow (history is supplementary, not load-bearing).
   */
  async record(input: RecordHistoryInput): Promise<void> {
    try {
      await planHistory.create({
        meal_plan: input.planId,
        group: input.group ?? null,
        user: input.actor?.id ?? null,
        user_name: input.actor?.name ?? 'System',
        action: input.action,
        day: input.day ?? '',
        summary: input.summary,
        before: input.before ?? null,
        after: input.after ?? null,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[plan-history] failed to record:', err);
    }
  },

  async listForPlan(planId: string, limit = 100): Promise<PlanHistoryEntry[]> {
    const res = await planHistory.getList(1, limit, {
      filter: `meal_plan = "${planId}"`,
      sort: '-created',
    });
    return res.items;
  },
};
