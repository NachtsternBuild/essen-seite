import { pb, COLLECTIONS } from '../lib/pocketbase';
import type {
  MealPlan,
  DayMeals,
  MealItem,
  WeekStatus,
  SharedPlan,
  SyncMode,
} from '../types';
import { getCurrentWeekNumber, getCurrentYear, weekLabel } from '../lib/utils';

export const mealService = {
  // ── Meal Plans ─────────────────────────────────────────────────────────────

  async getPlansForGroup(groupId: string): Promise<MealPlan[]> {
    return pb.collection(COLLECTIONS.MEAL_PLANS).getFullList<MealPlan>({
      filter: `group = "${groupId}"`,
      sort: '-year,-week_number',
    });
  },

  async getPlanByStatus(
    groupId: string,
    status: WeekStatus
  ): Promise<MealPlan | null> {
    try {
      return await pb
        .collection(COLLECTIONS.MEAL_PLANS)
        .getFirstListItem<MealPlan>(
          `group = "${groupId}" && status = "${status}"`
        );
    } catch {
      return null;
    }
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
    return pb.collection(COLLECTIONS.MEAL_PLANS).create<MealPlan>({
      group: groupId,
      year: year ?? getCurrentYear(),
      week_number: week ?? getCurrentWeekNumber(),
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
    return pb.collection(COLLECTIONS.MEAL_PLANS).create<MealPlan>({
      group: groupId,
      year: getCurrentYear(),
      week_number: getCurrentWeekNumber(),
      status,
      meals: sourcePlan.meals,
      synced_from: syncMode === 'sync' ? sourcePlan.id : undefined,
      sync_mode: syncMode,
    });
  },

  async updateMeals(planId: string, meals: DayMeals): Promise<MealPlan> {
    return pb
      .collection(COLLECTIONS.MEAL_PLANS)
      .update<MealPlan>(planId, { meals });
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
    return pb
      .collection(COLLECTIONS.MEAL_PLANS)
      .update<MealPlan>(planId, { status });
  },

  async delete(planId: string): Promise<void> {
    await pb.collection(COLLECTIONS.MEAL_PLANS).delete(planId);
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
    return pb.collection(COLLECTIONS.SHARED_PLANS).create<SharedPlan>({
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
    return pb.collection(COLLECTIONS.SHARED_PLANS).getFullList<SharedPlan>({
      sort: '-created',
    });
  },

  async adoptSharedPlan(
    sharedPlan: SharedPlan,
    targetGroupId: string,
    mode: SyncMode,
    status: WeekStatus = 'upcoming'
  ): Promise<MealPlan> {
    return pb.collection(COLLECTIONS.MEAL_PLANS).create<MealPlan>({
      group: targetGroupId,
      year: getCurrentYear(),
      week_number: getCurrentWeekNumber(),
      status,
      meals: sharedPlan.meals,
      synced_from: mode === 'sync' ? sharedPlan.source_plan : undefined,
      sync_mode: mode === 'sync' ? 'sync' : undefined,
    });
  },

  async deleteSharedPlan(id: string): Promise<void> {
    await pb.collection(COLLECTIONS.SHARED_PLANS).delete(id);
  },
};
