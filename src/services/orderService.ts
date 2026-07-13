import { repositories } from '../repositories';
import type { Order, OrdersByUser, DayOfWeek, AuthUser } from '../types';

const orders = repositories.orders;

export const orderService = {
  async getOrdersForPlan(planId: string): Promise<Order[]> {
    return orders.getFullList({ filter: `meal_plan = "${planId}"`, sort: 'user_name,day' });
  },

  async getOrdersForPlanAndGroup(planId: string, groupId: string): Promise<Order[]> {
    return orders.getFullList({
      filter: `meal_plan = "${planId}" && group = "${groupId}"`,
      sort: 'user_name,day',
    });
  },

  async getOrdersForGroup(groupId: string): Promise<Order[]> {
    return orders.getFullList({ filter: `group = "${groupId}"`, sort: '-created' });
  },

  /** All orders across every group (superuser statistics / comparison). */
  async getAllOrders(): Promise<Order[]> {
    return orders.getFullList({ sort: '-created' });
  },

  async getOrdersByUser(planId: string): Promise<OrdersByUser> {
    const list = await orderService.getOrdersForPlan(planId);
    return orderService.normalizeOrders(list);
  },

  async getOrdersByUserForGroup(planId: string, groupId: string): Promise<OrdersByUser> {
    const list = await orderService.getOrdersForPlanAndGroup(planId, groupId);
    return orderService.normalizeOrders(list);
  },

  normalizeOrders(list: Order[]): OrdersByUser {
    const result: OrdersByUser = {};
    list.forEach(order => {
      if (!result[order.user_name]) result[order.user_name] = {};
      result[order.user_name][order.day] = {
        id: order.id,
        meal_number: order.meal_number,
        meal_name: order.meal_name,
        meal_price: order.meal_price,
        edited: order.edited,
      };
    });
    return result;
  },

  async placeOrder(
    planId: string,
    groupId: string,
    user: AuthUser,
    day: DayOfWeek,
    meal_number: string,
    meal_name: string,
    meal_price: number,
    existingOrderId?: string
  ): Promise<Order> {
    if (existingOrderId) {
      return orders.update(existingOrderId, {
        meal_number,
        meal_name,
        meal_price,
        edited: true,
      });
    }

    return orders.create({
      meal_plan: planId,
      group: groupId,
      user: user.id,
      user_name: user.name,
      user_info: user.info ?? '',
      day,
      meal_number,
      meal_name,
      meal_price,
      edited: false,
    });
  },

  async deleteOrder(orderId: string): Promise<void> {
    await orders.delete(orderId);
  },

  async deleteOrdersForUser(planId: string, userId: string, groupId?: string): Promise<void> {
    const filter = groupId
      ? `meal_plan = "${planId}" && user = "${userId}" && group = "${groupId}"`
      : `meal_plan = "${planId}" && user = "${userId}"`;
    const list = await orders.getFullList({ filter });
    await Promise.all(list.map(o => orders.delete(o.id)));
  },

  async deleteAllOrdersForPlan(planId: string): Promise<void> {
    const list = await orders.getFullList({ filter: `meal_plan = "${planId}"` });
    await Promise.all(list.map(o => orders.delete(o.id)));
  },

  // Convert Orders to legacy WeekData format for backward compat
  ordersToLegacy(
    ordersByUser: OrdersByUser
  ): Record<string, Record<string, { number: string; name: string; price: number; edited: boolean }>> {
    const result: Record<
      string,
      Record<string, { number: string; name: string; price: number; edited: boolean }>
    > = {};
    Object.entries(ordersByUser).forEach(([userName, days]) => {
      result[userName] = {};
      Object.entries(days).forEach(([day, order]) => {
        result[userName][day] = {
          number: order.meal_number,
          name: order.meal_name,
          price: order.meal_price,
          edited: order.edited,
        };
      });
    });
    return result;
  },
};
