import { pb, COLLECTIONS } from '../lib/pocketbase';
import type { Order, OrdersByUser, DayOfWeek, AuthUser } from '../types';

export const orderService = {
  async getOrdersForPlan(planId: string): Promise<Order[]> {
    return pb.collection(COLLECTIONS.ORDERS).getFullList<Order>({
      filter: `meal_plan = "${planId}"`,
      sort: 'user_name,day',
    });
  },

  async getOrdersForPlanAndGroup(planId: string, groupId: string): Promise<Order[]> {
    return pb.collection(COLLECTIONS.ORDERS).getFullList<Order>({
      filter: `meal_plan = "${planId}" && group = "${groupId}"`,
      sort: 'user_name,day',
    });
  },

  async getOrdersForGroup(groupId: string): Promise<Order[]> {
    return pb.collection(COLLECTIONS.ORDERS).getFullList<Order>({
      filter: `group = "${groupId}"`,
      sort: '-created',
    });
  },

  async getOrdersByUser(planId: string): Promise<OrdersByUser> {
    const orders = await orderService.getOrdersForPlan(planId);
    return orderService.normalizeOrders(orders);
  },

  async getOrdersByUserForGroup(planId: string, groupId: string): Promise<OrdersByUser> {
    const orders = await orderService.getOrdersForPlanAndGroup(planId, groupId);
    return orderService.normalizeOrders(orders);
  },

  normalizeOrders(orders: Order[]): OrdersByUser {
    const result: OrdersByUser = {};
    orders.forEach(order => {
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
      return pb.collection(COLLECTIONS.ORDERS).update<Order>(existingOrderId, {
        meal_number,
        meal_name,
        meal_price,
        edited: true,
      });
    }

    return pb.collection(COLLECTIONS.ORDERS).create<Order>({
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
    await pb.collection(COLLECTIONS.ORDERS).delete(orderId);
  },

  async deleteOrdersForUser(planId: string, userId: string, groupId?: string): Promise<void> {
    const filter = groupId
      ? `meal_plan = "${planId}" && user = "${userId}" && group = "${groupId}"`
      : `meal_plan = "${planId}" && user = "${userId}"`;
    const orders = await pb.collection(COLLECTIONS.ORDERS).getFullList<Order>({ filter });
    await Promise.all(orders.map(o => pb.collection(COLLECTIONS.ORDERS).delete(o.id)));
  },

  async deleteAllOrdersForPlan(planId: string): Promise<void> {
    const orders = await pb
      .collection(COLLECTIONS.ORDERS)
      .getFullList<Order>({ filter: `meal_plan = "${planId}"` });
    await Promise.all(
      orders.map(o => pb.collection(COLLECTIONS.ORDERS).delete(o.id))
    );
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
