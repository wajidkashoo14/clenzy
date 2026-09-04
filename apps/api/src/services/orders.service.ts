import type { OrderPayload, PlaceOrderInput } from '@clenzy/shared';
import mongoose, { isValidObjectId } from 'mongoose';
import { COD_MAX_ORDER_VALUE_PAISE, PRICING_DEFAULTS } from '../config/pricing.js';
import { Address } from '../models/Address.js';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Counter } from '../models/Counter.js';
import { Order, type OrderDocument, type OrderItemSnapshot } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { ServiceCategory } from '../models/ServiceCategory.js';
import { ServiceItem } from '../models/ServiceItem.js';
import { SlotCapacity } from '../models/SlotCapacity.js';
import { SlotTemplate } from '../models/SlotTemplate.js';
import { resolveTieredPrice } from './cart.service.js';
import { isSlotCutoffPassed } from './slots.service.js';
import { validateCouponCore } from './coupons.service.js';
import { AppError } from '../utils/AppError.js';
import { addDaysToDateString, dayOfWeekOfDateString, nowInKolkata } from '../utils/timezone.js';

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
    },
    deliverySlot: {
      date: order.deliverySlot.date,
      window: order.deliverySlot.window,
      label: order.deliverySlot.label,
    },
    isExpress: order.isExpress,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    couponCode: order.couponCode,
    customerNote: order.customerNote,
    createdAt: order.createdAt.toISOString(),
  };
}

/** `CLZ-YYMMDD-NNNN`, atomically sequenced per day via `Counter`. */
async function nextOrderNumber(session: mongoose.ClientSession): Promise<string> {
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
async function reserveSlot(
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
 * The core order-placement flow — see docs/API_SPEC.md §7. Everything from
 * re-pricing through payment-record creation runs inside one transaction:
 * nothing is written unless the whole order is valid.
 */
export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<OrderPayload> {
  // Phase 8 adds Razorpay; Phase 7 is COD-only. Fails fast, no session needed.
  if (input.paymentMethod !== 'cod') {
    throw AppError.unprocessable(
      'PAYMENT_METHOD_NOT_AVAILABLE',
      'Online payment is coming soon — choose cash on delivery for now.',
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
      // Fallback turnaround if no item/category specifies one; raised per-item below.
      let maxTurnaroundHours = 48;

      for (const requested of input.items) {
        const dbItem = dbItemsById.get(requested.serviceItemId);
        if (!dbItem) {
          const existsButInactive = await ServiceItem.exists({
            _id: requested.serviceItemId,
          }).session(session);
          if (existsButInactive) {
            throw AppError.unprocessable(
              'ITEM_INACTIVE',
              'One of the items in your cart is no longer available.',
            );
          }
          throw AppError.notFound('One of the items in your cart was not found.');
        }
        if (
          dbItem.availableInAreas.length > 0 &&
          !dbItem.availableInAreas.some((areaId) => String(areaId) === pricingAreaId)
        ) {
          throw AppError.unprocessable(
            'ITEM_NOT_AVAILABLE_IN_AREA',
            `${dbItem.name} isn't available for delivery in your area.`,
          );
        }

        const clampedQuantity = Math.min(
          dbItem.maxQuantity,
          Math.max(dbItem.minQuantity, requested.quantity),
        );
        const usesPerItemExpressPrice = Boolean(input.isExpress && dbItem.expressPrice != null);
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
          addedBy: 'customer',
          isAdjusted: clampedQuantity !== requested.quantity,
        });

        itemsSubtotal += lineTotal;
        taxAmount += Math.round((lineTotal * dbItem.taxRatePercent) / 100);
        if (input.isExpress && !usesPerItemExpressPrice) expressSurchargeBase += lineTotal;

        const itemTurnaround = dbItem.turnaroundHours ?? category?.turnaroundHours ?? 48;
        maxTurnaroundHours = Math.max(maxTurnaroundHours, itemTurnaround);
      }

      const expressSurcharge =
        input.isExpress && expressSurchargeBase > 0
          ? Math.max(
              Math.round(expressSurchargeBase * PRICING_DEFAULTS.expressSurchargeRate),
              PRICING_DEFAULTS.minExpressSurchargePaise,
            )
          : 0;

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

      if (grandTotal > COD_MAX_ORDER_VALUE_PAISE) {
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

      const [order] = await Order.create(
        [
          {
            orderNumber,
            userId,
            type: 'standard',
            status: 'PLACED',
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
            },
            deliverySlot: {
              date: input.deliverySlot.date,
              window: input.deliverySlot.window,
              label: input.deliverySlot.window,
              estimated: false,
            },
            isExpress: input.isExpress,
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            couponCode: couponDoc?.code,
            couponId: couponDoc?._id,
            statusHistory: [{ status: 'PLACED', changedByRole: 'customer', at: now }],
            customerNote: input.customerNote,
            internalNotes: [],
            idempotencyKey: input.idempotencyKey,
            source: 'web',
          },
        ],
        { session },
      );
      if (!order) throw new Error('Order.create returned no document.');

      await Payment.create(
        [
          {
            orderId: order._id,
            userId,
            gateway: 'cod',
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

  return toOrderPayload(createdOrder!);
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export async function listOrders(userId: string): Promise<OrderPayload[]> {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();
  return orders.map(toOrderPayload);
}

export async function getOrder(userId: string, orderNumber: string): Promise<OrderPayload> {
  const order = await Order.findOne({ orderNumber, userId }).lean();
  if (!order) throw AppError.notFound('Order not found.');
  return toOrderPayload(order);
}
