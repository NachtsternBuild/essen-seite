import { repositories } from '../repositories';
import type {
  MealPlan,
  DayMeals,
  MealItem,
  WeekStatus,
  SharedPlan,
  SyncMode,
} from '../types';
import { getCurrentWeekNumber, getCurrentYear, weekLabel, nextCalendarWeek } from '../lib/utils';

/** Default year/week for a new plan: next week for 'upcoming', else this week. */
function defaultWeek(status: WeekStatus): { year: number; week: number } {
  return status === 'upcoming'
    ? nextCalendarWeek()
    : { year: getCurrentYear(), week: getCurrentWeekNumber() };
}

const mealPlans = repositories.mealPlans;
const sharedPlans = repositories.sharedPlans;

export const mealService = {
  // ── Meal Plans ─────────────────────────────────────────────────────────────

  async getPlansForGroup(groupId: string): Promise<MealPlan[]> {
    return mealPlans.getFullList({
      filter: `group = "${groupId}"`,
      sort: '-year,-week_number',
    });
  },

  async getPlanByStatus(
    groupId: string,
    status: WeekStatus
  ): Promise<MealPlan | null> {
    return mealPlans.getFirst(`group = "${groupId}" && status = "${status}"`);
  },

  async getActivePlans(
    groupId: string
  ): Promise<{ current: MealPlan | null; upcoming: MealPlan | null; previous: MealPlan | null }> {
    const [current, upcoming, previous] = await Promise.all([
      mealService.getPlanByStatus(groupId, 'current'),
      mealService.getPlanByStatus(groupId, 'upcoming'),
      mealService.getPlanByStatus(groupId, 'archived'),
    ]);
    return { current, upcoming, previous };
  },

  async createEmptyPlan(
    groupId: string,
    status: WeekStatus,
    year?: number,
    week?: number
  ): Promise<MealPlan> {
    const def = defaultWeek(status);
    return mealPlans.create({
      group: groupId,
      year: year ?? def.year,
      week_number: week ?? def.week,
      status,
      meals: {},
    });
  },

  async createFromPlan(
    groupId: string,
    sourcePlan: MealPlan,
    status: WeekStatus,
    syncMode: SyncMode = 'copy'
  ): Promise<MealPlan> {
    const def = defaultWeek(status);
    return mealPlans.create({
      group: groupId,
      year: def.year,
      week_number: def.week,
      status,
      meals: sourcePlan.meals,
      synced_from: syncMode === 'sync' ? sourcePlan.id : undefined,
      sync_mode: syncMode,
    });
  },

  async updateMeals(planId: string, meals: DayMeals): Promise<MealPlan> {
    return mealPlans.update(planId, { meals });
  },

  async addMealToDay(
    planId: string,
    currentMeals: DayMeals,
    day: string,
    meal: MealItem
  ): Promise<MealPlan> {
    const dayMeals = currentMeals[day] ?? [];
    const updated: DayMeals = {
      ...currentMeals,
      [day]: [...dayMeals, meal],
    };
    return mealService.updateMeals(planId, updated);
  },

  async removeMealFromDay(
    planId: string,
    currentMeals: DayMeals,
    day: string,
    index: number
  ): Promise<MealPlan> {
    const dayMeals = (currentMeals[day] ?? []).filter((_, i) => i !== index);
    const updated: DayMeals = { ...currentMeals, [day]: dayMeals };
    return mealService.updateMeals(planId, updated);
  },

  async updateStatus(planId: string, status: WeekStatus): Promise<MealPlan> {
    return mealPlans.update(planId, { status });
  },

  async delete(planId: string): Promise<void> {
    await mealPlans.delete(planId);
  },

  // ── Week Rotation ──────────────────────────────────────────────────────────

  async rotateWeek(groupId: string): Promise<void> {
    const { current, upcoming, previous } =
      await mealService.getActivePlans(groupId);

    if (previous) {
      await mealService.delete(previous.id);
    }
    if (current) {
      await mealService.updateStatus(current.id, 'archived');
    }
    if (upcoming) {
      await mealService.updateStatus(upcoming.id, 'current');
    }
  },

  // ── Shared Plans ───────────────────────────────────────────────────────────

  async sharePlan(
    plan: MealPlan,
    groupId: string,
    groupName: string,
    userId: string,
    userName: string,
    name: string,
    description?: string
  ): Promise<SharedPlan> {
    return sharedPlans.create({
      source_plan: plan.id,
      source_group: groupId,
      source_group_name: groupName,
      shared_by: userId,
      shared_by_name: userName,
      name,
      description,
      week_label: weekLabel(plan.year, plan.week_number),
      meals: plan.meals,
    });
  },

  async getSharedPlans(): Promise<SharedPlan[]> {
    return sharedPlans.getFullList({ sort: '-created' });
  },

  async adoptSharedPlan(
    sharedPlan: SharedPlan,
    targetGroupId: string,
    mode: SyncMode,
    status: WeekStatus = 'upcoming'
  ): Promise<MealPlan> {
    const def = defaultWeek(status);
    return mealPlans.create({
      group: targetGroupId,
      year: def.year,
      week_number: def.week,
      status,
      meals: sharedPlan.meals,
      synced_from: mode === 'sync' ? sharedPlan.source_plan : undefined,
      sync_mode: mode === 'sync' ? 'sync' : undefined,
    });
  },

  async deleteSharedPlan(id: string): Promise<void> {
    await sharedPlans.delete(id);
  },
};
