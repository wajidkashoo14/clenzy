import type { ReportDateRangeQuery } from '@clenzy/shared';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Order } from '../models/Order.js';
import { SlotCapacity } from '../models/SlotCapacity.js';
import { User } from '../models/User.js';
import { REVENUE_COUNTED_STATUSES } from './dashboard.service.js';
import { getSettings } from './settings.service.js';

function toRange(query: ReportDateRangeQuery): { start: Date; end: Date } {
  return {
    start: new Date(`${query.from}T00:00:00.000Z`),
    end: new Date(`${query.to}T23:59:59.999Z`),
  };
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function rowsToCsv(header: string[], rows: (string | number)[][]): string {
  const lines = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(','));
  return [header.join(','), ...lines].join('\n');
}

// ---------------------------------------------------------------------------
// Revenue — see docs/ADMIN_DASHBOARD.md §13.
// ---------------------------------------------------------------------------

export interface RevenueReport {
  gross: number;
  discounts: number;
  refunds: number;
  net: number;
  byPaymentMethod: { method: string; revenue: number; orders: number }[];
  byCategory: { category: string; revenue: number }[];
  byArea: { area: string; revenue: number }[];
}

export async function getRevenueReport(query: ReportDateRangeQuery): Promise<RevenueReport> {
  const { start, end } = toRange(query);
  const match = {
    createdAt: { $gte: start, $lte: end },
    status: { $in: REVENUE_COUNTED_STATUSES },
  };

  const [totals, byPaymentMethod, byCategory, byArea] = await Promise.all([
    Order.aggregate<{ gross: number; discounts: number; refunds: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          gross: { $sum: '$pricing.grandTotal' },
          discounts: { $sum: '$pricing.discountAmount' },
          refunds: { $sum: '$pricing.amountRefunded' },
        },
      },
    ]),
    Order.aggregate<{ _id: string; revenue: number; orders: number }>([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$pricing.grandTotal' },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.categoryName', revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: match },
      { $group: { _id: '$pickupAddress.area', revenue: { $sum: '$pricing.grandTotal' } } },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const t = totals[0] ?? { gross: 0, discounts: 0, refunds: 0 };
  return {
    gross: t.gross,
    discounts: t.discounts,
    refunds: t.refunds,
    net: t.gross - t.refunds,
    byPaymentMethod: byPaymentMethod.map((r) => ({
      method: r._id,
      revenue: r.revenue,
      orders: r.orders,
    })),
    byCategory: byCategory.map((r) => ({ category: r._id, revenue: r.revenue })),
    byArea: byArea.map((r) => ({ area: r._id, revenue: r.revenue })),
  };
}

export async function getRevenueReportCsv(query: ReportDateRangeQuery): Promise<string> {
  const report = await getRevenueReport(query);
  return rowsToCsv(
    ['breakdown', 'label', 'revenue', 'orders'],
    [
      ['summary', 'gross', report.gross, ''],
      ['summary', 'discounts', report.discounts, ''],
      ['summary', 'refunds', report.refunds, ''],
      ['summary', 'net', report.net, ''],
      ...report.byPaymentMethod.map((r) => ['paymentMethod', r.method, r.revenue, r.orders]),
      ...report.byCategory.map((r) => ['category', r.category, r.revenue, '']),
      ...report.byArea.map((r) => ['area', r.area, r.revenue, '']),
    ],
  );
}

// ---------------------------------------------------------------------------
// Orders — volume by status, cancellations, turnaround, failure rates.
// ---------------------------------------------------------------------------

export interface OrdersReport {
  totalOrders: number;
  byStatus: { status: string; count: number }[];
  cancellationRatePercent: number;
  cancellationReasons: { reason: string; count: number }[];
  /** Actual = deliveredAt minus the PICKED_UP entry in statusHistory. */
  avgTurnaroundHoursActual: number | null;
  /** From the live `settings` document — see the simplification note below. */
  avgTurnaroundHoursPromised: number;
  failedPickupRatePercent: number;
  failedDeliveryRatePercent: number;
}

export async function getOrdersReport(query: ReportDateRangeQuery): Promise<OrdersReport> {
  const { start, end } = toRange(query);
  const match = { createdAt: { $gte: start, $lte: end } };

  const [
    byStatusRaw,
    totalOrders,
    cancelled,
    cancellationReasonsRaw,
    failedLegs,
    deliveredOrders,
    settings,
  ] = await Promise.all([
    Order.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.countDocuments(match),
    Order.countDocuments({ ...match, status: 'CANCELLED' }),
    Order.aggregate<{ _id: string; count: number }>([
      { $match: { ...match, status: 'CANCELLED', 'cancellation.reason': { $exists: true } } },
      { $group: { _id: '$cancellation.reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Order.aggregate<{ failedPickup: number; failedDelivery: number; total: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          failedPickup: { $sum: { $cond: [{ $gt: ['$failedPickupAttempts', 0] }, 1, 0] } },
          failedDelivery: { $sum: { $cond: [{ $gt: ['$failedDeliveryAttempts', 0] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
    Order.find({ ...match, deliveredAt: { $exists: true } })
      .select('deliveredAt statusHistory')
      .lean(),
    getSettings(),
  ]);

  const turnaroundHours = deliveredOrders
    .map((order) => {
      const pickedUpAt = order.statusHistory.find((h) => h.status === 'PICKED_UP')?.at;
      if (!pickedUpAt || !order.deliveredAt) return null;
      return (order.deliveredAt.getTime() - pickedUpAt.getTime()) / (60 * 60 * 1000);
    })
    .filter((h): h is number => h !== null);

  const failedStats = failedLegs[0] ?? { failedPickup: 0, failedDelivery: 0, total: 0 };

  return {
    totalOrders,
    byStatus: byStatusRaw.map((r) => ({ status: r._id, count: r.count })),
    cancellationRatePercent:
      totalOrders > 0 ? Math.round((cancelled / totalOrders) * 1000) / 10 : 0,
    cancellationReasons: cancellationReasonsRaw.map((r) => ({ reason: r._id, count: r.count })),
    avgTurnaroundHoursActual:
      turnaroundHours.length > 0
        ? Math.round((turnaroundHours.reduce((a, b) => a + b, 0) / turnaroundHours.length) * 10) /
          10
        : null,
    avgTurnaroundHoursPromised: settings.defaultTurnaroundHours,
    failedPickupRatePercent:
      failedStats.total > 0
        ? Math.round((failedStats.failedPickup / failedStats.total) * 1000) / 10
        : 0,
    failedDeliveryRatePercent:
      failedStats.total > 0
        ? Math.round((failedStats.failedDelivery / failedStats.total) * 1000) / 10
        : 0,
  };
}

export async function getOrdersReportCsv(query: ReportDateRangeQuery): Promise<string> {
  const report = await getOrdersReport(query);
  return rowsToCsv(
    ['breakdown', 'label', 'count'],
    [
      ...report.byStatus.map((r) => ['status', r.status, r.count]),
      ...report.cancellationReasons.map((r) => ['cancellationReason', r.reason, r.count]),
      ['summary', 'cancellationRatePercent', report.cancellationRatePercent],
      ['summary', 'avgTurnaroundHoursActual', report.avgTurnaroundHoursActual ?? ''],
      ['summary', 'avgTurnaroundHoursPromised', report.avgTurnaroundHoursPromised],
      ['summary', 'failedPickupRatePercent', report.failedPickupRatePercent],
      ['summary', 'failedDeliveryRatePercent', report.failedDeliveryRatePercent],
    ],
  );
}

// ---------------------------------------------------------------------------
// Customers — new vs. returning, repeat rate, top customers, churn.
// ---------------------------------------------------------------------------

export interface CustomersReport {
  newCustomers: number;
  returningCustomers: number;
  repeatRatePercent: number;
  topCustomers: {
    userId: string;
    name: string;
    phone: string;
    orders: number;
    totalSpent: number;
  }[];
  /** Snapshot as of now, not scoped to the date range — see docs/ADMIN_DASHBOARD.md §13. */
  churnedCustomers: { userId: string; name: string; phone: string; lastOrderAt: string }[];
}

export async function getCustomersReport(query: ReportDateRangeQuery): Promise<CustomersReport> {
  const { start, end } = toRange(query);
  const match = {
    createdAt: { $gte: start, $lte: end },
    status: { $in: REVENUE_COUNTED_STATUSES },
  };

  const [byCustomer, topCustomersRaw, churnedRaw] = await Promise.all([
    Order.aggregate<{ _id: string; orders: number }>([
      { $match: match },
      { $group: { _id: '$userId', orders: { $sum: 1 } } },
    ]),
    Order.aggregate<{
      _id: string;
      orders: number;
      totalSpent: number;
      name?: string;
      phone: string;
    }>([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          orders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: { orders: 1, totalSpent: 1, name: '$user.name', phone: '$user.phone' } },
    ]),
    User.aggregate<{ _id: string; name?: string; phone: string; lastOrderAt: Date }>([
      { $match: { role: 'customer' } },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'lastOrder',
        },
      },
      { $unwind: '$lastOrder' },
      {
        $match: {
          'lastOrder.createdAt': { $lte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        },
      },
      { $project: { name: 1, phone: 1, lastOrderAt: '$lastOrder.createdAt' } },
      { $limit: 50 },
    ]),
  ]);

  const returningCustomers = byCustomer.filter((c) => c.orders > 1).length;
  const totalCustomersInRange = byCustomer.length;

  return {
    newCustomers: totalCustomersInRange - returningCustomers,
    returningCustomers,
    repeatRatePercent:
      totalCustomersInRange > 0
        ? Math.round((returningCustomers / totalCustomersInRange) * 1000) / 10
        : 0,
    topCustomers: topCustomersRaw.map((c) => ({
      userId: c._id,
      name: c.name ?? 'Unnamed',
      phone: c.phone,
      orders: c.orders,
      totalSpent: c.totalSpent,
    })),
    churnedCustomers: churnedRaw.map((c) => ({
      userId: c._id,
      name: c.name ?? 'Unnamed',
      phone: c.phone,
      lastOrderAt: c.lastOrderAt.toISOString(),
    })),
  };
}

export async function getCustomersReportCsv(query: ReportDateRangeQuery): Promise<string> {
  const report = await getCustomersReport(query);
  return rowsToCsv(
    ['type', 'name', 'phone', 'orders', 'totalSpentOrLastOrder'],
    [
      ...report.topCustomers.map((c) => ['topCustomer', c.name, c.phone, c.orders, c.totalSpent]),
      ...report.churnedCustomers.map((c) => ['churned', c.name, c.phone, '', c.lastOrderAt]),
    ],
  );
}

// ---------------------------------------------------------------------------
// Operations — slot utilization, agent performance, items processed.
// ---------------------------------------------------------------------------

export interface OperationsReport {
  slotUtilization: {
    type: string;
    window: string;
    booked: number;
    capacity: number;
    utilizationPercent: number;
  }[];
  agentPerformance: {
    agentId: string;
    name: string;
    tasksCompleted: number;
    tasksFailed: number;
  }[];
  itemsByCategory: { category: string; quantity: number; revenue: number }[];
}

export async function getOperationsReport(query: ReportDateRangeQuery): Promise<OperationsReport> {
  const { start, end } = toRange(query);
  const from = query.from;
  const to = query.to;

  const [slotAgg, pickupAgentAgg, deliveryAgentAgg, itemsAgg] = await Promise.all([
    SlotCapacity.aggregate<{
      _id: { type: string; window: string };
      booked: number;
      capacity: number;
    }>([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { type: '$type', window: '$window' },
          booked: { $sum: '$booked' },
          capacity: { $sum: '$capacity' },
        },
      },
    ]),
    Order.aggregate<{ _id: string; completed: number; failed: number }>([
      {
        $match: {
          'pickupSlot.date': { $gte: from, $lte: to },
          assignedPickupAgentId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$assignedPickupAgentId',
          completed: { $sum: { $cond: [{ $gt: ['$failedPickupAttempts', 0] }, 0, 1] } },
          failed: { $sum: { $cond: [{ $gt: ['$failedPickupAttempts', 0] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate<{ _id: string; completed: number; failed: number }>([
      {
        $match: {
          'deliverySlot.date': { $gte: from, $lte: to },
          assignedDeliveryAgentId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$assignedDeliveryAgentId',
          completed: { $sum: { $cond: [{ $gt: ['$failedDeliveryAttempts', 0] }, 0, 1] } },
          failed: { $sum: { $cond: [{ $gt: ['$failedDeliveryAttempts', 0] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate<{ _id: string; quantity: number; revenue: number }>([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: REVENUE_COUNTED_STATUSES },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.categoryName',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  // `_id` is an ObjectId at runtime despite the `string` type annotation above
  // (Mongoose aggregate results aren't re-cast) — stringify before using it as
  // a Map key, or two ObjectId instances for the same agent (one per
  // aggregate) would never merge, since Map compares object keys by identity.
  const agentTotals = new Map<string, { completed: number; failed: number }>();
  for (const row of [...pickupAgentAgg, ...deliveryAgentAgg]) {
    const agentId = String(row._id);
    const existing = agentTotals.get(agentId) ?? { completed: 0, failed: 0 };
    existing.completed += row.completed;
    existing.failed += row.failed;
    agentTotals.set(agentId, existing);
  }
  const agentIds = [...agentTotals.keys()];
  const agents = agentIds.length
    ? await User.find({ _id: { $in: agentIds } })
        .select('name phone')
        .lean()
    : [];
  const agentNameById = new Map(agents.map((a) => [String(a._id), a.name ?? a.phone]));

  return {
    slotUtilization: slotAgg.map((r) => ({
      type: r._id.type,
      window: r._id.window,
      booked: r.booked,
      capacity: r.capacity,
      utilizationPercent: r.capacity > 0 ? Math.round((r.booked / r.capacity) * 1000) / 10 : 0,
    })),
    agentPerformance: [...agentTotals.entries()].map(([agentId, stats]) => ({
      agentId,
      name: agentNameById.get(agentId) ?? 'Unknown',
      tasksCompleted: stats.completed,
      tasksFailed: stats.failed,
    })),
    itemsByCategory: itemsAgg.map((r) => ({
      category: r._id,
      quantity: r.quantity,
      revenue: r.revenue,
    })),
  };
}

export async function getOperationsReportCsv(query: ReportDateRangeQuery): Promise<string> {
  const report = await getOperationsReport(query);
  return rowsToCsv(
    ['type', 'label', 'value1', 'value2'],
    [
      ...report.slotUtilization.map((r) => [
        'slot',
        `${r.type} ${r.window}`,
        r.booked,
        `${r.utilizationPercent}%`,
      ]),
      ...report.agentPerformance.map((r) => ['agent', r.name, r.tasksCompleted, r.tasksFailed]),
      ...report.itemsByCategory.map((r) => ['item', r.category, r.quantity, r.revenue]),
    ],
  );
}

// ---------------------------------------------------------------------------
// Coupons — redemptions, discount cost, revenue attributed.
// ---------------------------------------------------------------------------

export interface CouponsReport {
  coupons: { code: string; redemptions: number; discountCost: number; revenueAttributed: number }[];
}

export async function getCouponsReport(query: ReportDateRangeQuery): Promise<CouponsReport> {
  const { start, end } = toRange(query);

  const redemptions = await CouponRedemption.aggregate<{
    _id: string;
    redemptions: number;
    discountCost: number;
  }>([
    { $match: { redeemedAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$couponId',
        redemptions: { $sum: 1 },
        discountCost: { $sum: '$discountAmount' },
      },
    },
  ]);
  if (redemptions.length === 0) return { coupons: [] };

  const couponIds = redemptions.map((r) => r._id);
  const [coupons, revenueByCoupon] = await Promise.all([
    Coupon.find({ _id: { $in: couponIds } })
      .select('code')
      .lean(),
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: { couponId: { $in: couponIds }, status: { $in: REVENUE_COUNTED_STATUSES } } },
      { $group: { _id: '$couponId', revenue: { $sum: '$pricing.grandTotal' } } },
    ]),
  ]);
  const codeById = new Map(coupons.map((c) => [String(c._id), c.code]));
  const revenueById = new Map(revenueByCoupon.map((r) => [String(r._id), r.revenue]));

  return {
    coupons: redemptions.map((r) => ({
      code: codeById.get(String(r._id)) ?? 'Unknown',
      redemptions: r.redemptions,
      discountCost: r.discountCost,
      revenueAttributed: revenueById.get(String(r._id)) ?? 0,
    })),
  };
}

export async function getCouponsReportCsv(query: ReportDateRangeQuery): Promise<string> {
  const report = await getCouponsReport(query);
  return rowsToCsv(
    ['code', 'redemptions', 'discountCost', 'revenueAttributed'],
    report.coupons.map((c) => [c.code, c.redemptions, c.discountCost, c.revenueAttributed]),
  );
}
