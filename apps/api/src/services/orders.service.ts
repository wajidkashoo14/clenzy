import type {
  OrderListQuery,
  OrderListResult,
  OrderPayload,
  OrderStatus,
  OrderTrackResult,
  PlaceOrderInput,
  PlaceOrderResult,
  RescheduleOrderInput,
} from '@clenzy/shared';
import { ORDER_STATUS_LABELS } from '@clenzy/shared';
import mongoose, { isValidObjectId, Types, type FilterQuery } from 'mongoose';
import { logger } from '../config/logger.js';
import { COD_MAX_ORDER_VALUE_PAISE, PRICING_DEFAULTS } from '../config/pricing.js';
import { Address } from '../models/Address.js';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Counter } from '../models/Counter.js';
import { Order, type OrderDocument, type OrderItemSnapshot } from '../models/Order.js';
import { Payment, type PaymentDocument } from '../models/Payment.js';
import { ServiceCategory } from '../models/ServiceCategory.js';
import { ServiceItem } from '../models/ServiceItem.js';
import { SlotCapacity } from '../models/SlotCapacity.js';
import { SlotTemplate } from '../models/SlotTemplate.js';
import { User } from '../models/User.js';
import { resolveTieredPrice } from './cart.service.js';
import { isSlotCutoffPassed } from './slots.service.js';
import { validateCouponCore } from './coupons.service.js';
import {
  applyRefund,
  applyRefundToOrderPricing,
  createGatewayOrderForOrder,
} from './payments.service.js';
import { changeStatus } from './orderStatus.service.js';
import { sendNotification } from './notifications/notificationService.js';
import { notifyOrderStatusChange } from './notifications/orderStatusNotifications.js';
import { notifyRefund } from './notifications/refundNotifications.js';
import { AppError } from '../utils/AppError.js';
import { addDaysToDateString, dayOfWeekOfDateString, nowInKolkata } from '../utils/timezone.js';

const RECLEAN_WINDOW_HOURS = 72; // Confirmed: docs/PROJECT_REQUIREMENTS.md §7.
const MAX_RESCHEDULES = 2; // Confirmed: docs/DATABASE.md "rescheduleCount — Cap at 2".

type PaymentLean = PaymentDocument & { _id: unknown };

type OrderLean = OrderDocument & { _id: unknown };

function toOrderPayload(order: OrderLean): OrderPayload {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    items: order.items.map((item) => ({
      serviceItemId: String(item.serviceItemId),
      categoryId: String(item.categoryId),
      name: item.name,
      categoryName: item.categoryName,
      unit: item.unit,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRatePercent: item.taxRatePercent,
      lineTotal: item.lineTotal,
      careNote: item.careNote,
    })),
    pricing: {
      itemsSubtotal: order.pricing.itemsSubtotal,
      expressSurcharge: order.pricing.expressSurcharge,
      deliveryFee: order.pricing.deliveryFee,
      discountAmount: order.pricing.discountAmount,
      taxAmount: order.pricing.taxAmount,
      grandTotal: order.pricing.grandTotal,
    },
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    pickupSlot: {
      date: order.pickupSlot.date,
      window: order.pickupSlot.window,
      label: order.pickupSlot.label,
      areaId: String(order.pickupSlot.areaId),
    },
    deliverySlot: {
      date: order.deliverySlot.date,
      window: order.deliverySlot.window,
      label: order.deliverySlot.label,
      areaId: String(order.deliverySlot.areaId),
    },
    isExpress: order.isExpress,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    couponCode: order.couponCode,
    customerNote: order.customerNote,
    rescheduleCount: order.rescheduleCount,
    failedPickupAttempts: order.failedPickupAttempts,
    failedDeliveryAttempts: order.failedDeliveryAttempts,
    cancellation: order.cancellation && {
      reason: order.cancellation.reason,
      cancelledByRole: order.cancellation.cancelledByRole,
      at: order.cancellation.at.toISOString(),
      refundEligible: order.cancellation.refundEligible,
    },
    priceRevision: order.priceRevision && {
      originalTotal: order.priceRevision.originalTotal,
      revisedTotal: order.priceRevision.revisedTotal,
      reason: order.priceRevision.reason,
      requiresApproval: order.priceRevision.requiresApproval,
      approvedAt: order.priceRevision.approvedAt?.toISOString(),
    },
    deliveredAt: order.deliveredAt?.toISOString(),
    completedAt: order.completedAt?.toISOString(),
    createdAt: order.createdAt.toISOString(),
  };
}

/** `CLZ-YYMMDD-NNNN`, atomically sequenced per day via `Counter`. */
export async function nextOrderNumber(session: mongoose.ClientSession): Promise<string> {
  const { dateString } = nowInKolkata();
  const yymmdd = dateString.slice(2).replace(/-/g, '');
  const counterId = `orderNumber:${yymmdd}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session },
  );
  return `CLZ-${yymmdd}-${String(counter.seq).padStart(4, '0')}`;
}

/**
 * Ensures a `SlotCapacity` doc exists, then atomically reserves one unit of
 * capacity with a guarded `findOneAndUpdate` (`booked < capacity`). Run
 * inside `session.withTransaction`, whose driver-level retry handles the
 * write-conflict case where two concurrent orders race for the same
 * just-created doc — see docs/DEVELOPMENT_PLAN.md Phase 7's
 * 20-concurrent-orders capacity test.
 */
export async function reserveSlot(
  type: 'pickup' | 'delivery',
  date: string,
  window: string,
  areaId: string,
  session: mongoose.ClientSession,
): Promise<void> {
  const template = await SlotTemplate.findOne({
    type,
    window,
    dayOfWeek: dayOfWeekOfDateString(date),
    isActive: true,
    $or: [{ areaIds: { $size: 0 } }, { areaIds: areaId }],
  }).session(session);

  if (!template) {
    throw AppError.conflict(
      'SLOT_UNAVAILABLE',
      `The selected ${type} slot is no longer available.`,
    );
  }
  if (isSlotCutoffPassed(date, window, template.cutoffMinutesBefore)) {
    throw AppError.unprocessable(
      'SLOT_CUTOFF_PASSED',
      `Booking for the selected ${type} slot has closed.`,
    );
  }

  await SlotCapacity.findOneAndUpdate(
    { date, window, type, areaId },
    { $setOnInsert: { capacity: template.capacity, booked: 0 } },
    { upsert: true, session },
  );

  const reserved = await SlotCapacity.findOneAndUpdate(
    { date, window, type, areaId, booked: { $lt: template.capacity } },
    { $inc: { booked: 1 } },
    { new: true, session },
  );

  if (!reserved) {
    throw AppError.conflict('SLOT_UNAVAILABLE', `The selected ${type} slot just filled up.`);
  }
}

/**
 * The inverse of `reserveSlot` — called on cancellation/expiry. Exported for
 * jobs/expireAbandonedOrders.ts. Floors at 0 via the `booked: { $gt: 0 }`
 * guard so a double-release (e.g. a retried job run) can't go negative.
 */
export async function releaseSlot(
  type: 'pickup' | 'delivery',
  date: string,
  window: string,
  areaId: string,
  session: mongoose.ClientSession,
): Promise<void> {
  await SlotCapacity.findOneAndUpdate(
    { date, window, type, areaId, booked: { $gt: 0 } },
    { $inc: { booked: -1 } },
    { session },
  );
}

interface PricedItemsResult {
  orderItems: OrderItemSnapshot[];
  itemsSubtotal: number;
  expressSurcharge: number;
  taxAmount: number;
  maxTurnaroundHours: number;
}

/**
 * Re-prices a set of requested lines against the live catalog — the shared
 * core of both `placeOrder` (customer checkout) and `adminOrders.service.ts`'s
 * `createManualOrder` (staff phone/WhatsApp intake). Extracted rather than
 * duplicated so tiered pricing, express pricing, and area-availability rules
 * only ever live in one place. See docs/API_SPEC.md §7.
 */
export async function priceOrderItems(
  items: { serviceItemId: string; quantity: number }[],
  areaId: string,
  isExpress: boolean,
  session: mongoose.ClientSession,
  addedBy: 'customer' | 'admin' = 'customer',
): Promise<PricedItemsResult> {
  const itemIds = items.map((line) => line.serviceItemId);
  const dbItems = await ServiceItem.find({ _id: { $in: itemIds }, isActive: true })
    .session(session)
    .lean();
  const dbItemsById = new Map(dbItems.map((item) => [String(item._id), item]));

  const categoryIds = [...new Set(dbItems.map((item) => String(item.categoryId)))];
  const categories = await ServiceCategory.find({ _id: { $in: categoryIds } })
    .session(session)
    .lean();
  const categoryById = new Map(categories.map((category) => [String(category._id), category]));

  const orderItems: OrderItemSnapshot[] = [];
  let itemsSubtotal = 0;
  let expressSurchargeBase = 0;
  let taxAmount = 0;
  let maxTurnaroundHours = 48;

  for (const requested of items) {
    const dbItem = dbItemsById.get(requested.serviceItemId);
    if (!dbItem) {
      const existsButInactive = await ServiceItem.exists({ _id: requested.serviceItemId }).session(
        session,
      );
      if (existsButInactive) {
        throw AppError.unprocessable(
          'ITEM_INACTIVE',
          'One of the items in this order is no longer available.',
        );
      }
      throw AppError.notFound('One of the items in this order was not found.');
    }
    if (
      dbItem.availableInAreas.length > 0 &&
      !dbItem.availableInAreas.some((id) => String(id) === areaId)
    ) {
      throw AppError.unprocessable(
        'ITEM_NOT_AVAILABLE_IN_AREA',
        `${dbItem.name} isn't available for delivery in this area.`,
      );
    }

    const clampedQuantity = Math.min(
      dbItem.maxQuantity,
      Math.max(dbItem.minQuantity, requested.quantity),
    );
    const usesPerItemExpressPrice = Boolean(isExpress && dbItem.expressPrice != null);
    const unitPrice = usesPerItemExpressPrice
      ? dbItem.expressPrice!
      : resolveTieredPrice(dbItem, clampedQuantity);
    const lineTotal = unitPrice * clampedQuantity;
    const category = categoryById.get(String(dbItem.categoryId));

    orderItems.push({
      serviceItemId: dbItem._id,
      categoryId: dbItem.categoryId,
      name: dbItem.name,
      categoryName: category?.name ?? '',
      unit: dbItem.unit,
      unitPrice,
      quantity: clampedQuantity,
      taxRatePercent: dbItem.taxRatePercent,
      lineTotal,
      careNote: dbItem.careNote,
      addedBy,
      isAdjusted: clampedQuantity !== requested.quantity,
    });

    itemsSubtotal += lineTotal;
    taxAmount += Math.round((lineTotal * dbItem.taxRatePercent) / 100);
    if (isExpress && !usesPerItemExpressPrice) expressSurchargeBase += lineTotal;

    const itemTurnaround = dbItem.turnaroundHours ?? category?.turnaroundHours ?? 48;
    maxTurnaroundHours = Math.max(maxTurnaroundHours, itemTurnaround);
  }

  const expressSurcharge =
    isExpress && expressSurchargeBase > 0
      ? Math.max(
          Math.round(expressSurchargeBase * PRICING_DEFAULTS.expressSurchargeRate),
          PRICING_DEFAULTS.minExpressSurchargePaise,
        )
      : 0;

  return { orderItems, itemsSubtotal, expressSurcharge, taxAmount, maxTurnaroundHours };
}

/**
 * The core order-placement flow — see docs/API_SPEC.md §7. Everything from
 * re-pricing through payment-record creation runs inside one transaction:
 * nothing is written unless the whole order is valid.
 */
export async function placeOrder(
  userId: string,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  // Wallet is V2 — not built. Fails fast, no session needed.
  if (input.paymentMethod === 'wallet') {
    throw AppError.unprocessable(
      'PAYMENT_METHOD_NOT_AVAILABLE',
      'Wallet payments are not available yet.',
    );
  }

  const replay = await Order.findOne({ userId, idempotencyKey: input.idempotencyKey }).lean();
  if (replay) {
    throw AppError.conflict('DUPLICATE_REQUEST', 'This order was already placed.', {
      order: toOrderPayload(replay),
    });
  }

  if (!isValidObjectId(input.pickupAddressId) || !isValidObjectId(input.deliveryAddressId)) {
    throw AppError.notFound('Address not found.');
  }
  const itemIds = input.items.map((line) => line.serviceItemId);
  const invalidItemId = itemIds.find((id) => !isValidObjectId(id));
  if (invalidItemId) throw AppError.notFound('One of the items in your cart was not found.');

  const session = await mongoose.startSession();
  let createdOrder: OrderLean | undefined;
  let createdPayment: PaymentLean | undefined;

  try {
    await session.withTransaction(async () => {
      const [pickupAddress, deliveryAddress] = await Promise.all([
        Address.findOne({ _id: input.pickupAddressId, userId, deletedAt: null }).session(session),
        Address.findOne({ _id: input.deliveryAddressId, userId, deletedAt: null }).session(session),
      ]);
      if (!pickupAddress || !deliveryAddress) throw AppError.notFound('Address not found.');
      if (!pickupAddress.serviceAreaId || !deliveryAddress.serviceAreaId) {
        throw AppError.unprocessable(
          'ADDRESS_NOT_SERVICEABLE',
          'One of your addresses is outside our delivery area.',
        );
      }
      // Single areaId drives pricing/availability, mirroring `POST /cart/estimate`'s one-areaId contract.
      const pricingAreaId = String(pickupAddress.serviceAreaId);

      const { orderItems, itemsSubtotal, expressSurcharge, taxAmount, maxTurnaroundHours } =
        await priceOrderItems(
          input.items,
          pricingAreaId,
          Boolean(input.isExpress),
          session,
          'customer',
        );

      const combinedSubtotal = itemsSubtotal + expressSurcharge;
      const deliveryFee =
        combinedSubtotal >= PRICING_DEFAULTS.freeDeliveryThresholdPaise
          ? 0
          : PRICING_DEFAULTS.deliveryFeePaise;

      if (combinedSubtotal < PRICING_DEFAULTS.minOrderValuePaise) {
        throw AppError.unprocessable(
          'MIN_ORDER_NOT_MET',
          `The minimum order value is ₹${PRICING_DEFAULTS.minOrderValuePaise / 100}.`,
        );
      }

      let discountAmount = 0;
      let couponDoc: Awaited<ReturnType<typeof validateCouponCore>>['coupon'] | undefined;
      if (input.couponCode) {
        const categoryIds = [...new Set(orderItems.map((item) => String(item.categoryId)))];
        const outcome = await validateCouponCore({
          code: input.couponCode,
          userId,
          categoryIds,
          areaId: pricingAreaId,
          subtotal: combinedSubtotal,
          session,
        });
        couponDoc = outcome.coupon;
        discountAmount = outcome.discountAmount;
      }

      const grandTotal =
        itemsSubtotal + expressSurcharge + deliveryFee + taxAmount - discountAmount;

      if (input.paymentMethod === 'cod' && grandTotal > COD_MAX_ORDER_VALUE_PAISE) {
        throw AppError.unprocessable(
          'COD_LIMIT_EXCEEDED',
          `Cash on delivery is available for orders up to ₹${COD_MAX_ORDER_VALUE_PAISE / 100}.`,
        );
      }

      const turnaroundHours = input.isExpress ? 24 : maxTurnaroundHours;
      const earliestDeliveryDate = addDaysToDateString(
        input.pickupSlot.date,
        Math.ceil(turnaroundHours / 24),
      );
      if (input.deliverySlot.date < earliestDeliveryDate) {
        throw AppError.unprocessable(
          'INVALID_DELIVERY_DATE',
          `The earliest possible delivery date is ${earliestDeliveryDate}.`,
        );
      }

      await reserveSlot(
        'pickup',
        input.pickupSlot.date,
        input.pickupSlot.window,
        String(pickupAddress.serviceAreaId),
        session,
      );
      await reserveSlot(
        'delivery',
        input.deliverySlot.date,
        input.deliverySlot.window,
        String(deliveryAddress.serviceAreaId),
        session,
      );

      const snapshotAddress = (address: NonNullable<typeof pickupAddress>) => ({
        label: address.label,
        contactName: address.contactName,
        contactPhone: address.contactPhone,
        line1: address.line1,
        line2: address.line2,
        landmark: address.landmark,
        area: address.area,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      });

      const orderNumber = await nextOrderNumber(session);
      const now = new Date();

      // COD is placed directly; online starts PENDING_PAYMENT until the webhook
      // confirms capture — see docs/PAYMENTS_AND_NOTIFICATIONS.md §1.3/§1.4.
      const initialStatus = input.paymentMethod === 'cod' ? 'PLACED' : 'PENDING_PAYMENT';

      const [order] = await Order.create(
        [
          {
            orderNumber,
            userId,
            type: 'standard',
            status: initialStatus,
            items: orderItems,
            pricing: {
              itemsSubtotal,
              expressSurcharge,
              deliveryFee,
              pickupFee: 0,
              smallOrderFee: 0,
              discountAmount,
              taxAmount,
              walletApplied: 0,
              grandTotal,
              amountPaid: 0,
              amountRefunded: 0,
            },
            pickupAddress: snapshotAddress(pickupAddress),
            deliveryAddress: snapshotAddress(deliveryAddress),
            pickupSlot: {
              date: input.pickupSlot.date,
              window: input.pickupSlot.window,
              label: input.pickupSlot.window,
              areaId: pickupAddress.serviceAreaId,
            },
            deliverySlot: {
              date: input.deliverySlot.date,
              window: input.deliverySlot.window,
              label: input.deliverySlot.window,
              estimated: false,
              areaId: deliveryAddress.serviceAreaId,
            },
            isExpress: input.isExpress,
            paymentMethod: input.paymentMethod,
            paymentStatus: 'pending',
            couponCode: couponDoc?.code,
            couponId: couponDoc?._id,
            statusHistory: [{ status: initialStatus, changedByRole: 'customer', at: now }],
            customerNote: input.customerNote,
            internalNotes: [],
            idempotencyKey: input.idempotencyKey,
            source: 'web',
          },
        ],
        { session },
      );
      if (!order) throw new Error('Order.create returned no document.');

      const [payment] = await Payment.create(
        [
          {
            orderId: order._id,
            userId,
            gateway: input.paymentMethod === 'cod' ? 'cod' : 'razorpay',
            amount: grandTotal,
            currency: 'INR',
            status: 'created',
            idempotencyKey: `${input.idempotencyKey}:payment`,
            webhookEvents: [],
            refunds: [],
          },
        ],
        { session },
      );
      if (!payment) throw new Error('Payment.create returned no document.');

      if (couponDoc) {
        await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: 1 } }).session(session);
        await CouponRedemption.create(
          [
            {
              couponId: couponDoc._id,
              userId,
              orderId: order._id,
              discountAmount,
              redeemedAt: now,
            },
          ],
          { session },
        );
      }

      createdOrder = order.toObject();
      createdPayment = payment.toObject();
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const original = await Order.findOne({ userId, idempotencyKey: input.idempotencyKey }).lean();
      if (original) {
        throw AppError.conflict('DUPLICATE_REQUEST', 'This order was already placed.', {
          order: toOrderPayload(original),
        });
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const orderPayload = toOrderPayload(createdOrder!);
  if (input.paymentMethod === 'cod') {
    // A COD order is created directly at PLACED (see `initialStatus` above) —
    // it never goes through changeStatus(), so notifyOrderStatusChange()'s
    // automatic hook never runs for it. An online order doesn't need this:
    // it starts PENDING_PAYMENT and only reaches PLACED via the webhook's
    // changeStatus() call, which fires the notification itself.
    notifyOrderStatusChange(createdOrder!, 'PLACED').catch((err: unknown) =>
      logger.error(
        { err, orderNumber: createdOrder!.orderNumber },
        'notifyOrderStatusChange failed',
      ),
    );
    return { order: orderPayload };
  }

  // Outside the transaction, per docs/API_SPEC.md §7's documented sequence.
  const gatewayOrder = await createGatewayOrderForOrder(createdOrder!, createdPayment!);
  return { order: orderPayload, payment: gatewayOrder };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/** See docs/API_SPEC.md §7 — GET /orders. Own order history, filtered and paginated. */
export async function listOrders(userId: string, query: OrderListQuery): Promise<OrderListResult> {
  const filter: FilterQuery<OrderDocument> = { userId };
  if (query.status) filter.status = query.status;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from && { $gte: new Date(query.from) }),
      ...(query.to && { $lte: new Date(query.to) }),
    };
  }

  const skip = (query.page - 1) * query.pageSize;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map(toOrderPayload),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getOrder(userId: string, orderNumber: string): Promise<OrderPayload> {
  const order = await Order.findOne({ orderNumber, userId }).lean();
  if (!order) throw AppError.notFound('Order not found.');
  return toOrderPayload(order);
}

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/cancel. */
const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'PICKUP_SCHEDULED',
];

export async function cancelOrder(
  userId: string,
  orderNumber: string,
  reason: string,
): Promise<OrderPayload> {
  const session = await mongoose.startSession();
  let cancelledOrder: OrderLean | undefined;
  let refundTarget: { gatewayPaymentId: string; amount: number } | undefined;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderNumber, userId }).session(session);
      if (!order) throw AppError.notFound('Order not found.');
      if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
        throw AppError.unprocessable(
          'CANCELLATION_NOT_ALLOWED',
          'This order can no longer be cancelled online — please contact support.',
        );
      }

      await releaseSlot(
        'pickup',
        order.pickupSlot.date,
        order.pickupSlot.window,
        String(order.pickupSlot.areaId),
        session,
      );
      await releaseSlot(
        'delivery',
        order.deliverySlot.date,
        order.deliverySlot.window,
        String(order.deliverySlot.areaId),
        session,
      );

      if (order.couponId) {
        await Coupon.updateOne({ _id: order.couponId }, { $inc: { usedCount: -1 } }).session(
          session,
        );
        await CouponRedemption.deleteOne({ orderId: order._id }).session(session);
      }

      // See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.6: "Cancelled before pickup (prepaid) — 100%".
      const refundEligible = order.paymentStatus === 'paid';
      order.cancellation = {
        reason,
        cancelledBy: new Types.ObjectId(userId),
        cancelledByRole: 'customer',
        at: new Date(),
        refundEligible,
      };
      await changeStatus(order, 'CANCELLED', 'customer', {
        actorUserId: userId,
        note: reason,
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

  notifyOrderStatusChange(cancelledOrder!, 'CANCELLED').catch((err: unknown) =>
    logger.error(
      { err, orderNumber: cancelledOrder!.orderNumber },
      'notifyOrderStatusChange failed',
    ),
  );

  if (refundTarget) {
    // Outside the transaction — a real gateway call shouldn't be inside one. See payments.service.ts.
    await applyRefund(
      refundTarget.gatewayPaymentId,
      refundTarget.amount,
      'Order cancelled by customer',
      userId,
    );
    const refreshedOrder = await Order.findById(cancelledOrder!._id);
    if (refreshedOrder) {
      applyRefundToOrderPricing(refreshedOrder, refundTarget.amount);
      await refreshedOrder.save();
      cancelledOrder = refreshedOrder.toObject();
      notifyRefund(refreshedOrder, refundTarget.amount).catch((err: unknown) =>
        logger.error({ err, orderNumber: refreshedOrder.orderNumber }, 'notifyRefund failed'),
      );
    }
  }

  return toOrderPayload(cancelledOrder!);
}

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/reschedule. */
const PICKUP_RESCHEDULABLE_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKUP_FAILED',
];
const DELIVERY_RESCHEDULABLE_STATUSES: OrderStatus[] = [
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERY_FAILED',
];

export async function rescheduleOrder(
  userId: string,
  orderNumber: string,
  input: RescheduleOrderInput,
): Promise<OrderPayload> {
  const session = await mongoose.startSession();
  let updatedOrder: OrderLean | undefined;
  let recoveredTo: OrderStatus | undefined;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderNumber, userId }).session(session);
      if (!order) throw AppError.notFound('Order not found.');

      if (order.rescheduleCount >= MAX_RESCHEDULES) {
        throw AppError.unprocessable(
          'MAX_RESCHEDULES_REACHED',
          `This order has already been rescheduled ${MAX_RESCHEDULES} times.`,
        );
      }

      const allowedStatuses =
        input.type === 'pickup' ? PICKUP_RESCHEDULABLE_STATUSES : DELIVERY_RESCHEDULABLE_STATUSES;
      if (!allowedStatuses.includes(order.status)) {
        throw AppError.unprocessable(
          'RESCHEDULE_NOT_ALLOWED_IN_STATUS',
          `This order's ${input.type} can no longer be rescheduled.`,
        );
      }

      const currentSlot = input.type === 'pickup' ? order.pickupSlot : order.deliverySlot;
      const areaId = String(currentSlot.areaId);

      // Both calls run inside this transaction — if reserving the new slot fails,
      // the whole transaction (including the release below) rolls back together.
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

      const recoveryTarget: OrderStatus | undefined =
        order.status === 'PICKUP_FAILED'
          ? 'PICKUP_SCHEDULED'
          : order.status === 'DELIVERY_FAILED'
            ? 'OUT_FOR_DELIVERY'
            : undefined;

      if (recoveryTarget) {
        await changeStatus(order, recoveryTarget, 'customer', {
          actorUserId: userId,
          note: `Rescheduled ${input.type}`,
          session,
        });
        recoveredTo = recoveryTarget;
      } else {
        await order.save({ session });
      }

      updatedOrder = order.toObject();
    });
  } finally {
    await session.endSession();
  }

  if (recoveredTo) {
    notifyOrderStatusChange(updatedOrder!, recoveredTo).catch((err: unknown) =>
      logger.error(
        { err, orderNumber: updatedOrder!.orderNumber },
        'notifyOrderStatusChange failed',
      ),
    );
  }

  return toOrderPayload(updatedOrder!);
}

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/reclean. Free — see docs/PROJECT_REQUIREMENTS.md §7's confirmed 72h window. */
export async function requestReclean(userId: string, orderNumber: string): Promise<OrderPayload> {
  const parent = await Order.findOne({ orderNumber, userId });
  if (!parent) throw AppError.notFound('Order not found.');
  if (parent.type === 'reclean') {
    throw AppError.unprocessable(
      'RECLEAN_NOT_ALLOWED',
      'A re-clean order cannot itself be re-cleaned.',
    );
  }
  if (parent.status !== 'DELIVERED' && parent.status !== 'COMPLETED') {
    throw AppError.unprocessable(
      'RECLEAN_NOT_ALLOWED',
      'Re-clean can only be requested after delivery.',
    );
  }
  if (
    !parent.deliveredAt ||
    Date.now() - parent.deliveredAt.getTime() > RECLEAN_WINDOW_HOURS * 60 * 60 * 1000
  ) {
    throw AppError.unprocessable(
      'RECLEAN_WINDOW_EXPIRED',
      `Re-clean requests must be made within ${RECLEAN_WINDOW_HOURS} hours of delivery.`,
    );
  }

  const session = await mongoose.startSession();
  let createdReclean: OrderLean | undefined;

  try {
    await session.withTransaction(async () => {
      const today = nowInKolkata().dateString;
      const pickupDate = addDaysToDateString(today, 1);
      const deliveryDate = addDaysToDateString(today, 3);

      await reserveSlot(
        'pickup',
        pickupDate,
        parent.pickupSlot.window,
        String(parent.pickupSlot.areaId),
        session,
      );
      await reserveSlot(
        'delivery',
        deliveryDate,
        parent.deliverySlot.window,
        String(parent.deliverySlot.areaId),
        session,
      );

      const orderNumberValue = await nextOrderNumber(session);
      const now = new Date();

      const [reclean] = await Order.create(
        [
          {
            orderNumber: orderNumberValue,
            userId,
            type: 'reclean',
            parentOrderId: parent._id,
            status: 'PLACED',
            items: parent.items,
            pricing: {
              itemsSubtotal: 0,
              expressSurcharge: 0,
              deliveryFee: 0,
              pickupFee: 0,
              smallOrderFee: 0,
              discountAmount: 0,
              taxAmount: 0,
              walletApplied: 0,
              grandTotal: 0,
              amountPaid: 0,
              amountRefunded: 0,
            },
            pickupAddress: parent.pickupAddress,
            deliveryAddress: parent.deliveryAddress,
            pickupSlot: {
              date: pickupDate,
              window: parent.pickupSlot.window,
              label: parent.pickupSlot.window,
              areaId: parent.pickupSlot.areaId,
            },
            deliverySlot: {
              date: deliveryDate,
              window: parent.deliverySlot.window,
              label: parent.deliverySlot.window,
              areaId: parent.deliverySlot.areaId,
              estimated: false,
            },
            isExpress: false,
            paymentMethod: 'cod',
            paymentStatus: 'paid',
            statusHistory: [
              {
                status: 'PLACED',
                changedByRole: 'customer',
                note: `Re-clean requested for ${parent.orderNumber}`,
                at: now,
              },
            ],
            internalNotes: [],
            source: 'web',
          },
        ],
        { session },
      );
      if (!reclean) throw new Error('Order.create returned no document.');
      createdReclean = reclean.toObject();
    });
  } finally {
    await session.endSession();
  }

  sendNotification({
    userId,
    type: 'reclean_accepted',
    orderId: String(createdReclean!._id),
    data: {
      parentOrderNumber: parent.orderNumber,
      recleanOrderNumber: createdReclean!.orderNumber,
      pickupDate: createdReclean!.pickupSlot.date,
    },
  }).catch((err: unknown) =>
    logger.error({ err, orderNumber: createdReclean!.orderNumber }, 'sendNotification failed'),
  );

  return toOrderPayload(createdReclean!);
}

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/approve-revision. */
export async function approveRevision(userId: string, orderNumber: string): Promise<OrderPayload> {
  const order = await Order.findOne({ orderNumber, userId });
  if (!order) throw AppError.notFound('Order not found.');
  if (!order.priceRevision?.requiresApproval) {
    throw AppError.unprocessable(
      'NO_PENDING_REVISION',
      'There is no price revision awaiting your approval.',
    );
  }

  order.priceRevision.requiresApproval = false;
  order.priceRevision.approvedAt = new Date();
  order.priceRevision.approvedBy = new Types.ObjectId(userId);
  order.pricing.grandTotal = order.priceRevision.revisedTotal;
  order.statusHistory.push({
    status: order.status,
    changedBy: new Types.ObjectId(userId),
    changedByRole: 'customer',
    note: 'Price revision approved',
    at: new Date(),
  });
  await order.save();

  return toOrderPayload(order.toObject());
}

/**
 * See docs/API_SPEC.md §7 — GET /orders/:orderNumber/track. On the happy
 * path, shows the full expected sequence with future steps marked
 * incomplete; off it (cancelled, failed, refunding), shows what actually
 * happened instead, since overlaying those onto a fixed sequence would lie.
 */
const HAPPY_PATH: OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'PROCESSING',
  'QUALITY_CHECK',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
];
const AGENT_VISIBLE_STATUSES: OrderStatus[] = ['PICKUP_SCHEDULED', 'OUT_FOR_DELIVERY'];
const ENDED_STATUSES: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

export async function trackOrder(userId: string, orderNumber: string): Promise<OrderTrackResult> {
  const order = await Order.findOne({ orderNumber, userId }).lean();
  if (!order) throw AppError.notFound('Order not found.');

  const currentIndex = HAPPY_PATH.indexOf(order.status);
  const timeline: OrderTrackResult['timeline'] =
    currentIndex >= 0
      ? HAPPY_PATH.map((status, index) => {
          const historyEntry = order.statusHistory.find((h) => h.status === status);
          return {
            status,
            label: ORDER_STATUS_LABELS[status],
            at: historyEntry?.at.toISOString(),
            isCompleted: index <= currentIndex,
            isCurrent: index === currentIndex,
            note: historyEntry?.note,
          };
        })
      : order.statusHistory.map((entry, index) => ({
          status: entry.status,
          label: ORDER_STATUS_LABELS[entry.status],
          at: entry.at.toISOString(),
          isCompleted: true,
          isCurrent: index === order.statusHistory.length - 1,
          note: entry.note,
        }));

  let agent: OrderTrackResult['agent'] = null;
  if (AGENT_VISIBLE_STATUSES.includes(order.status)) {
    const agentId =
      order.status === 'PICKUP_SCHEDULED'
        ? order.assignedPickupAgentId
        : order.assignedDeliveryAgentId;
    const agentUser = agentId ? await User.findById(agentId).lean() : null;
    if (agentUser) agent = { name: agentUser.name ?? 'Your agent', phone: agentUser.phone };
  }

  return {
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    timeline,
    estimatedDelivery: ENDED_STATUSES.includes(order.status) ? undefined : order.deliverySlot.date,
    agent,
  };
}
