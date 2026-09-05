import type { DashboardQuery, DashboardResult, NeedsAttentionItem } from '@clenzy/shared';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@clenzy/shared';
import { Lead } from '../models/Lead.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { nowInKolkata } from '../utils/timezone.js';

const RANGE_MS: Record<DashboardQuery['range'], number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

/** Non-cancelled/refunded orders count toward "booked" revenue and volume. */
const REVENUE_COUNTED_STATUSES = ORDER_STATUSES.filter((s) => s !== 'CANCELLED');

async function computeNeedsAttention(): Promise<NeedsAttentionItem[]> {
  const now = Date.now();
  const today = nowInKolkata().dateString;
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);

  const [
    failedPayments,
    pendingRevisions,
    failedLegs,
    unassignedToday,
    processingOrders,
    pendingRefunds,
    unmoderatedReviews,
    unactionedLeads,
  ] = await Promise.all([
    Order.countDocuments({ paymentStatus: 'failed', createdAt: { $gte: hoursAgo(24) } }),
    Order.countDocuments({
      'priceRevision.requiresApproval': true,
      updatedAt: { $lte: hoursAgo(2) },
    }),
    Order.countDocuments({ status: { $in: ['PICKUP_FAILED', 'DELIVERY_FAILED'] } }),
    Order.countDocuments({
      status: { $in: ['CONFIRMED', 'PICKUP_SCHEDULED'] },
      'pickupSlot.date': today,
      assignedPickupAgentId: { $exists: false },
    }),
    // No per-order turnaround field exists — approximate "past expected
    // turnaround" as PROCESSING for more than 48h (the seeded default).
    Order.find({ status: 'PROCESSING' }).select('statusHistory').lean(),
    Order.countDocuments({ paymentStatus: 'refund_pending', updatedAt: { $lte: hoursAgo(48) } }),
    Review.countDocuments({ status: 'pending', createdAt: { $lte: hoursAgo(24) } }),
    Lead.countDocuments({ status: 'new', createdAt: { $lte: hoursAgo(24) } }),
  ]);

  const overdueProcessing = processingOrders.filter((order) => {
    const pickedUpAt = order.statusHistory.find((h) => h.status === 'PICKED_UP')?.at;
    return pickedUpAt && now - pickedUpAt.getTime() > 48 * 60 * 60 * 1000;
  }).length;

  const items: NeedsAttentionItem[] = [
    { key: 'failed_payments', label: 'Failed payments (24h)', count: failedPayments },
    {
      key: 'pending_revisions',
      label: 'Price revisions awaiting approval (2h+)',
      count: pendingRevisions,
    },
    { key: 'failed_legs', label: 'Failed pickups/deliveries not rescheduled', count: failedLegs },
    { key: 'unassigned_today', label: "Today's pickups with no agent", count: unassignedToday },
    {
      key: 'overdue_processing',
      label: 'Orders past expected turnaround',
      count: overdueProcessing,
    },
    { key: 'pending_refunds', label: 'Refunds pending (48h+)', count: pendingRefunds },
    {
      key: 'unmoderated_reviews',
      label: 'Unmoderated reviews / unactioned leads (24h+)',
      count: unmoderatedReviews + unactionedLeads,
    },
  ];

  return items.filter((item) => item.count > 0);
}

export async function getDashboard(query: DashboardQuery): Promise<DashboardResult> {
  const rangeMs = RANGE_MS[query.range];
  const now = Date.now();
  const currentStart = new Date(now - rangeMs);
  const previousStart = new Date(now - 2 * rangeMs);

  const [
    currentAgg,
    previousAgg,
    newCustomersCurrent,
    newCustomersPrevious,
    pendingPayments,
    needsAttention,
  ] = await Promise.all([
    Order.aggregate<{ revenue: number; count: number }>([
      { $match: { createdAt: { $gte: currentStart }, status: { $in: REVENUE_COUNTED_STATUSES } } },
      { $group: { _id: null, revenue: { $sum: '$pricing.grandTotal' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ revenue: number; count: number }>([
      {
        $match: {
          createdAt: { $gte: previousStart, $lt: currentStart },
          status: { $in: REVENUE_COUNTED_STATUSES },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$pricing.grandTotal' }, count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: 'customer', createdAt: { $gte: currentStart } }),
    User.countDocuments({
      role: 'customer',
      createdAt: { $gte: previousStart, $lt: currentStart },
    }),
    Order.countDocuments({ paymentStatus: { $in: ['pending', 'failed'] } }),
    computeNeedsAttention(),
  ]);

  const current = currentAgg[0] ?? { revenue: 0, count: 0 };
  const previous = previousAgg[0] ?? { revenue: 0, count: 0 };
  const currentAov = current.count > 0 ? Math.round(current.revenue / current.count) : 0;
  const previousAov = previous.count > 0 ? Math.round(previous.revenue / previous.count) : 0;

  const [revenueOverTimeRaw, ordersByStatusRaw, popularServicesRaw] = await Promise.all([
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: { createdAt: { $gte: currentStart }, status: { $in: REVENUE_COUNTED_STATUSES } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' },
          },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: currentStart } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: string; revenue: number; volume: number }>([
      { $match: { createdAt: { $gte: currentStart } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.categoryName',
          revenue: { $sum: '$items.lineTotal' },
          volume: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const today = nowInKolkata().dateString;
  const [pickupsDue, deliveriesDue, inFacility, pickupAgentsToday, deliveryAgentsToday] =
    await Promise.all([
      Order.countDocuments({
        'pickupSlot.date': today,
        status: { $in: ['CONFIRMED', 'PICKUP_SCHEDULED'] },
      }),
      Order.countDocuments({
        'deliverySlot.date': today,
        status: { $in: ['READY', 'OUT_FOR_DELIVERY'] },
      }),
      Order.countDocuments({ status: { $in: ['PICKED_UP', 'PROCESSING', 'QUALITY_CHECK'] } }),
      Order.distinct('assignedPickupAgentId', {
        'pickupSlot.date': today,
        assignedPickupAgentId: { $exists: true },
      }),
      Order.distinct('assignedDeliveryAgentId', {
        'deliverySlot.date': today,
        assignedDeliveryAgentId: { $exists: true },
      }),
    ]);
  const agentsOnShift = new Set([
    ...pickupAgentsToday.map(String),
    ...deliveryAgentsToday.map(String),
  ]).size;

  return {
    stats: {
      revenue: { current: current.revenue, previous: previous.revenue },
      ordersPlaced: { current: current.count, previous: previous.count },
      newCustomers: { current: newCustomersCurrent, previous: newCustomersPrevious },
      averageOrderValue: { current: currentAov, previous: previousAov },
      pendingPayments,
      ordersNeedingAttention: needsAttention.reduce((sum, item) => sum + item.count, 0),
    },
    needsAttention,
    charts: {
      revenueOverTime: revenueOverTimeRaw.map((r) => ({ date: r._id, revenue: r.revenue })),
      ordersByStatus: ordersByStatusRaw.map((r) => ({
        status: ORDER_STATUS_LABELS[r._id as keyof typeof ORDER_STATUS_LABELS] ?? r._id,
        count: r.count,
      })),
      popularServices: popularServicesRaw.map((r) => ({
        name: r._id,
        revenue: r.revenue,
        volume: r.volume,
      })),
    },
    today: { pickupsDue, deliveriesDue, inFacility, agentsOnShift },
  };
}
