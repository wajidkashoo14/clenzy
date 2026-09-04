import type {
  AdminCancelOrderInput,
  AdminOrderListQuery,
  AssignAgentInput,
  OrderRosterQuery,
  OrderStatus,
  ReviseOrderItemsInput,
  Role,
  UpdateOrderStatusInput,
} from '@clenzy/shared';
import { ORDER_STATUSES } from '@clenzy/shared';
import mongoose, { isValidObjectId, Types, type FilterQuery } from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Order, type OrderDocument } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { ServiceCategory } from '../models/ServiceCategory.js';
import { ServiceItem } from '../models/ServiceItem.js';
import { User } from '../models/User.js';
import { applyRefund, applyRefundToOrderPricing } from './payments.service.js';
import { changeStatus, type TransitionActor } from './orderStatus.service.js';
import { releaseSlot, reserveSlot } from './orders.service.js';
import { AppError } from '../utils/AppError.js';

type OrderLean = OrderDocument & { _id: unknown };

const PRE_PICKUP_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKUP_FAILED',
];
const PRE_DELIVERY_STATUSES: OrderStatus[] = [
  ...PRE_PICKUP_STATUSES,
  'PICKED_UP',
  'PROCESSING',
  'QUALITY_CHECK',
  'READY',
];

/** See docs/API_SPEC.md §10 — GET /admin/orders. No admin UI consumes this yet (Phase 12); returns lean documents as-is. */
export async function listOrdersAdmin(
  query: AdminOrderListQuery,
): Promise<{ orders: OrderLean[]; total: number; page: number; pageSize: number }> {
  const filter: FilterQuery<OrderDocument> = {};
  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from && { $gte: new Date(query.from) }),
      ...(query.to && { $lte: new Date(query.to) }),
    };
  }

  // Two independent $or-shaped conditions (agent match, text search) — combined
  // via $and so setting both doesn't have the second silently clobber the first.
  const andConditions: FilterQuery<OrderDocument>[] = [];
  if (query.agentId && isValidObjectId(query.agentId)) {
    andConditions.push({
      $or: [{ assignedPickupAgentId: query.agentId }, { assignedDeliveryAgentId: query.agentId }],
    });
  }
  if (query.q) {
    andConditions.push({
      $or: [
        { orderNumber: new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { 'pickupAddress.contactPhone': query.q },
      ],
    });
  }
  if (andConditions.length > 0) filter.$and = andConditions;

  const skip = (query.page - 1) * query.pageSize;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: query.page, pageSize: query.pageSize };
}

export async function getOrderAdmin(orderId: string): Promise<OrderLean> {
  if (!isValidObjectId(orderId)) throw AppError.notFound('Order not found.');
  const order = await Order.findById(orderId).lean();
  if (!order) throw AppError.notFound('Order not found.');
  return order;
}

/** See docs/API_SPEC.md §10 — PATCH /admin/orders/:id/status. Goes through the single transition-map function; see docs/PAYMENTS_AND_NOTIFICATIONS.md §2.1. */
export async function updateOrderStatus(
  actor: TransitionActor,
  actorUserId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
): Promise<OrderLean> {
  if (!ORDER_STATUSES.includes(input.status as OrderStatus)) {
    throw AppError.badRequest(
      'INVALID_STATUS',
      `"${input.status}" is not a recognized order status.`,
    );
  }
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found.');
  await changeStatus(order, input.status as OrderStatus, actor, { actorUserId, note: input.note });
  return order.toObject();
}

/** See docs/API_SPEC.md §10 — PATCH /admin/orders/:id/assign. Assigning a pickup agent on a CONFIRMED order auto-advances it. */
export async function assignAgent(
  actorUserId: string,
  orderId: string,
  input: AssignAgentInput,
): Promise<OrderLean> {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found.');
  if (!isValidObjectId(input.agentId))
    throw AppError.badRequest('INVALID_AGENT', 'Invalid agent id.');

  const agent = await User.findOne({ _id: input.agentId, role: 'agent' });
  if (!agent) throw AppError.badRequest('INVALID_AGENT', 'That user is not a registered agent.');

  if (input.type === 'pickup') {
    order.assignedPickupAgentId = agent._id;
    if (order.status === 'CONFIRMED') {
      await changeStatus(order, 'PICKUP_SCHEDULED', 'system', {
        actorUserId,
        note: 'Pickup agent assigned',
      });
      return order.toObject();
    }
  } else {
    order.assignedDeliveryAgentId = agent._id;
  }
  await order.save();
  return order.toObject();
}

/** See docs/API_SPEC.md §10 — PATCH /admin/orders/:id/slots. Same mechanics as the customer reschedule, without the count cap or ownership check. */
export async function rescheduleOrderAdmin(
  actorUserId: string,
  orderId: string,
  input: { type: 'pickup' | 'delivery'; date: string; window: string },
): Promise<OrderLean> {
  const session = await mongoose.startSession();
  let updated: OrderLean | undefined;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw AppError.notFound('Order not found.');

      const currentSlot = input.type === 'pickup' ? order.pickupSlot : order.deliverySlot;
      const areaId = String(currentSlot.areaId);

      await releaseSlot(input.type, currentSlot.date, currentSlot.window, areaId, session);
      await reserveSlot(input.type, input.date, input.window, areaId, session);

      if (input.type === 'pickup') {
        order.pickupSlot = {
          date: input.date,
          window: input.window,
          label: input.window,
          areaId: currentSlot.areaId,
        };
      } else {
        order.deliverySlot = {
          date: input.date,
          window: input.window,
          label: input.window,
          areaId: currentSlot.areaId,
          estimated: false,
        };
      }
      order.rescheduleCount += 1;
      order.internalNotes.push({
        note: `${input.type === 'pickup' ? 'Pickup' : 'Delivery'} rescheduled by staff to ${input.date} ${input.window}`,
        by: new Types.ObjectId(actorUserId),
        at: new Date(),
      });
      await order.save({ session });
      updated = order.toObject();
    });
  } finally {
    await session.endSession();
  }

  return updated!;
}

/** See docs/API_SPEC.md §10 — POST /admin/orders/:id/notes. */
export async function addInternalNote(
  actorUserId: string,
  orderId: string,
  note: string,
): Promise<OrderLean> {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { $push: { internalNotes: { note, by: new Types.ObjectId(actorUserId), at: new Date() } } },
    { new: true },
  ).lean();
  if (!order) throw AppError.notFound('Order not found.');
  return order;
}

/** See docs/API_SPEC.md §10 — POST /admin/orders/:id/cancel. Admin can cancel from any non-terminal status ("post-pickup" per docs/PAYMENTS_AND_NOTIFICATIONS.md §2.1). */
export async function cancelOrderAdmin(
  actorUserId: string,
  actorRole: Role,
  orderId: string,
  input: AdminCancelOrderInput,
): Promise<OrderLean> {
  // The `cancellation.cancelledByRole` field only distinguishes staff vs admin — superadmin outranks both.
  const cancelledByRole = actorRole === 'staff' ? 'staff' : 'admin';
  const session = await mongoose.startSession();
  let cancelledOrder: OrderLean | undefined;
  let refundTarget: { gatewayPaymentId: string; amount: number } | undefined;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw AppError.notFound('Order not found.');

      if (PRE_PICKUP_STATUSES.includes(order.status)) {
        await releaseSlot(
          'pickup',
          order.pickupSlot.date,
          order.pickupSlot.window,
          String(order.pickupSlot.areaId),
          session,
        );
      }
      if (PRE_DELIVERY_STATUSES.includes(order.status)) {
        await releaseSlot(
          'delivery',
          order.deliverySlot.date,
          order.deliverySlot.window,
          String(order.deliverySlot.areaId),
          session,
        );
      }
      if (order.couponId && PRE_PICKUP_STATUSES.includes(order.status)) {
        await Coupon.updateOne({ _id: order.couponId }, { $inc: { usedCount: -1 } }).session(
          session,
        );
        await CouponRedemption.deleteOne({ orderId: order._id }).session(session);
      }

      const refundEligible = input.refundEligible ?? order.paymentStatus === 'paid';
      order.cancellation = {
        reason: input.reason,
        cancelledBy: new Types.ObjectId(actorUserId),
        cancelledByRole,
        at: new Date(),
        refundEligible,
      };
      await changeStatus(order, 'CANCELLED', actorRole, {
        actorUserId,
        note: input.reason,
        session,
      });

      if (refundEligible) {
        const payment = await Payment.findOne({
          orderId: order._id,
          gateway: 'razorpay',
          status: 'captured',
        }).session(session);
        if (payment?.gatewayPaymentId) {
          refundTarget = {
            gatewayPaymentId: payment.gatewayPaymentId,
            amount: order.pricing.amountPaid,
          };
        }
      }

      cancelledOrder = order.toObject();
    });
  } finally {
    await session.endSession();
  }

  if (refundTarget) {
    await applyRefund(
      refundTarget.gatewayPaymentId,
      refundTarget.amount,
      `Admin cancellation: ${input.reason}`,
      actorUserId,
    );
    const refreshed = await Order.findById(cancelledOrder!._id);
    if (refreshed) {
      applyRefundToOrderPricing(refreshed, refundTarget.amount);
      await refreshed.save();
      cancelledOrder = refreshed.toObject();
    }
  }

  return cancelledOrder!;
}

/**
 * See docs/API_SPEC.md §10 — PATCH /admin/orders/:id/items. Re-prices from
 * the current catalog unless a line overrides the unit price (e.g. a damage
 * surcharge). A revision that raises the total by more than 10% requires
 * customer approval before it's reflected in `pricing.grandTotal` — see
 * docs/PROJECT_REQUIREMENTS.md §7's confirmed threshold.
 */
const PRICE_REVISION_APPROVAL_THRESHOLD = 0.1;

export async function reviseOrderItems(
  actorUserId: string,
  orderId: string,
  input: ReviseOrderItemsInput,
): Promise<OrderLean> {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found.');

  const itemIds = input.items.map((line) => line.serviceItemId);
  const dbItems = await ServiceItem.find({ _id: { $in: itemIds } }).lean();
  const dbItemsById = new Map(dbItems.map((item) => [String(item._id), item]));

  const categoryIds = [...new Set(dbItems.map((item) => String(item.categoryId)))];
  const categories = await ServiceCategory.find({ _id: { $in: categoryIds } }).lean();
  const categoryNameById = new Map(
    categories.map((category) => [String(category._id), category.name]),
  );

  const originalTotal = order.pricing.grandTotal;
  let itemsSubtotal = 0;
  let taxAmount = 0;

  order.items = input.items.map((line) => {
    const dbItem = dbItemsById.get(line.serviceItemId);
    if (!dbItem) throw AppError.notFound(`Item ${line.serviceItemId} not found.`);
    const unitPrice = line.unitPrice ?? dbItem.price;
    const lineTotal = unitPrice * line.quantity;
    itemsSubtotal += lineTotal;
    taxAmount += Math.round((lineTotal * dbItem.taxRatePercent) / 100);
    return {
      serviceItemId: dbItem._id,
      categoryId: dbItem.categoryId,
      name: dbItem.name,
      categoryName: categoryNameById.get(String(dbItem.categoryId)) ?? '',
      unit: dbItem.unit,
      unitPrice,
      quantity: line.quantity,
      taxRatePercent: dbItem.taxRatePercent,
      lineTotal,
      careNote: line.careNote,
      addedBy: 'admin',
      isAdjusted: true,
    };
  });

  const revisedTotal =
    itemsSubtotal +
    order.pricing.expressSurcharge +
    order.pricing.deliveryFee +
    taxAmount -
    order.pricing.discountAmount;
  order.pricing.itemsSubtotal = itemsSubtotal;
  order.pricing.taxAmount = taxAmount;

  const increasedFraction = originalTotal > 0 ? (revisedTotal - originalTotal) / originalTotal : 0;
  const requiresApproval = increasedFraction > PRICE_REVISION_APPROVAL_THRESHOLD;

  if (requiresApproval) {
    // Total stays at the original until the customer approves — see approveRevision() in orders.service.ts.
    order.priceRevision = {
      originalTotal,
      revisedTotal,
      reason: input.reason,
      requiresApproval: true,
    };
  } else {
    order.pricing.grandTotal = revisedTotal;
  }

  order.internalNotes.push({
    note: `Itemization revised: ₹${(originalTotal / 100).toFixed(0)} → ₹${(revisedTotal / 100).toFixed(0)} — ${input.reason}`,
    by: new Types.ObjectId(actorUserId),
    at: new Date(),
  });
  await order.save();

  return order.toObject();
}

/** See docs/API_SPEC.md §10 — GET /admin/orders/roster. */
export async function getOrderRoster(query: OrderRosterQuery): Promise<OrderLean[]> {
  const slotField = query.type === 'pickup' ? 'pickupSlot.date' : 'deliverySlot.date';
  const relevantStatuses: OrderStatus[] =
    query.type === 'pickup' ? ['CONFIRMED', 'PICKUP_SCHEDULED'] : ['READY', 'OUT_FOR_DELIVERY'];

  return Order.find({ [slotField]: query.date, status: { $in: relevantStatuses } })
    .sort({ [`${query.type}Slot.window`]: 1 })
    .lean();
}
