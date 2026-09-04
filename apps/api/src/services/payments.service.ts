import type {
  PaymentRetryResult,
  PaymentStatusResult,
  PaymentVerifyInput,
  RefundInput,
  RefundResult,
} from '@clenzy/shared';
import { Types, type HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { razorpayAdapter } from '../integrations/razorpay/index.js';
import { Order, type OrderDocument } from '../models/Order.js';
import { Payment, type PaymentDocument } from '../models/Payment.js';
import { AppError } from '../utils/AppError.js';
import { verifyCheckoutSignature } from '../utils/razorpaySignature.js';

type OrderLean = OrderDocument & { _id: unknown };
type PaymentLean = PaymentDocument & { _id: unknown };

/** No real key in dev/fake mode — the frontend decides real-vs-simulated checkout from its own `NEXT_PUBLIC_RAZORPAY_KEY_ID`, not this value. */
function currentKeyId(): string {
  return env.RAZORPAY_KEY_ID ?? 'rzp_test_fake_dev_key';
}

export interface GatewayOrderInfo {
  gateway: 'razorpay';
  razorpayOrderId: string;
  amount: number;
  keyId: string;
}

/**
 * Creates the Razorpay order for a just-placed online order — called
 * outside the placement transaction, per docs/API_SPEC.md §7's documented
 * sequence ("Then, outside the transaction, create the Razorpay order").
 */
export async function createGatewayOrderForOrder(
  order: OrderLean,
  payment: PaymentLean,
): Promise<GatewayOrderInfo> {
  const gatewayOrder = await razorpayAdapter.createOrder({
    amount: order.pricing.grandTotal,
    currency: 'INR',
    receipt: order.orderNumber,
  });
  await Payment.updateOne({ _id: payment._id }, { $set: { gatewayOrderId: gatewayOrder.id } });
  return {
    gateway: 'razorpay',
    razorpayOrderId: gatewayOrder.id,
    amount: gatewayOrder.amount,
    keyId: currentKeyId(),
  };
}

/**
 * See docs/API_SPEC.md §8 — POST /payments/verify. Advisory only: the
 * checkout-callback signature is a UI hint, never what marks an order
 * paid — that's the webhook's job alone (the "golden rule", see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §1.1).
 */
export async function verifyClientPayment(
  userId: string,
  input: PaymentVerifyInput,
): Promise<{ verified: boolean }> {
  const order = await Order.findOne({ orderNumber: input.orderNumber, userId }).lean();
  if (!order) throw AppError.notFound('Order not found.');

  const payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 }).lean();
  if (!payment || payment.gatewayOrderId !== input.razorpayOrderId) {
    throw AppError.badRequest('PAYMENT_MISMATCH', 'This payment does not match the order.');
  }

  return {
    verified: verifyCheckoutSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    ),
  };
}

export async function getPaymentStatus(
  userId: string,
  orderNumber: string,
): Promise<PaymentStatusResult> {
  const order = await Order.findOne({ orderNumber, userId }).lean();
  if (!order) throw AppError.notFound('Order not found.');
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
  };
}

/** See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5 "Payment failed" — a new gateway order against the same Clenzy order. */
export async function retryPayment(
  userId: string,
  orderNumber: string,
): Promise<PaymentRetryResult> {
  const order = await Order.findOne({ orderNumber, userId });
  if (!order) throw AppError.notFound('Order not found.');
  if (order.status !== 'PENDING_PAYMENT' || order.paymentMethod !== 'online') {
    throw AppError.unprocessable(
      'RETRY_NOT_ALLOWED',
      'This order is not awaiting an online payment.',
    );
  }

  const gatewayOrder = await razorpayAdapter.createOrder({
    amount: order.pricing.grandTotal,
    currency: 'INR',
    receipt: order.orderNumber,
  });

  await Payment.create({
    orderId: order._id,
    userId,
    gateway: 'razorpay',
    gatewayOrderId: gatewayOrder.id,
    amount: order.pricing.grandTotal,
    currency: 'INR',
    status: 'created',
    idempotencyKey: `${order.orderNumber}:retry:${Date.now()}`,
    webhookEvents: [],
    refunds: [],
  });

  // Back to pending for the new attempt — otherwise a poller watching this order
  // (see /checkout/processing) would still see `failed` from the previous one.
  order.paymentStatus = 'pending';
  await order.save();

  return {
    gateway: 'razorpay',
    razorpayOrderId: gatewayOrder.id,
    amount: gatewayOrder.amount,
    keyId: currentKeyId(),
  };
}

/**
 * Always goes through the real gateway refund API; never just flips a
 * flag. Only touches the Payment doc (appends the refund record) — the
 * order's `pricing.amountRefunded`/`paymentStatus` are the caller's
 * responsibility to update on its own already-loaded order instance,
 * so two callers can never race each other into overwriting one
 * another's save with stale data. Shared by the admin refund endpoint
 * and cancelOrder's automatic refund-on-cancel — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §1.6.
 */
export async function applyRefund(
  gatewayPaymentId: string,
  amount: number,
  reason: string,
  initiatedByUserId?: string,
): Promise<RefundResult> {
  const refund = await razorpayAdapter.createRefund({ paymentId: gatewayPaymentId, amount });

  const payment = await Payment.findOne({ gatewayPaymentId });
  if (payment) {
    payment.refunds.push({
      refundId: refund.id,
      amount,
      reason,
      status: refund.status,
      initiatedBy: initiatedByUserId ? new Types.ObjectId(initiatedByUserId) : undefined,
      at: new Date(),
    });
    await payment.save();
  }

  return { refundId: refund.id, amount, status: refund.status };
}

/** Applies a completed refund's amount to an already-loaded order — does not save it; the caller does. */
export function applyRefundToOrderPricing(
  order: HydratedDocument<OrderDocument>,
  amount: number,
): void {
  const newAmountRefunded = order.pricing.amountRefunded + amount;
  order.pricing.amountRefunded = newAmountRefunded;
  order.paymentStatus =
    newAmountRefunded >= order.pricing.amountPaid ? 'refunded' : 'partially_refunded';
}

/** ADMIN only — see docs/API_SPEC.md §10. Full or partial refund of a captured online payment. */
export async function refundOrder(
  adminId: string,
  orderId: string,
  input: RefundInput,
): Promise<RefundResult> {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found.');

  const payment = await Payment.findOne({
    orderId: order._id,
    gateway: 'razorpay',
    status: 'captured',
  }).sort({ createdAt: -1 });
  if (!payment?.gatewayPaymentId) {
    throw AppError.unprocessable(
      'NOT_REFUNDABLE',
      'This order has no captured online payment to refund.',
    );
  }

  const remaining = order.pricing.amountPaid - order.pricing.amountRefunded;
  const amount = input.amount ?? remaining;
  if (amount <= 0 || amount > remaining) {
    throw AppError.unprocessable(
      'REFUND_EXCEEDS_REMAINING',
      `Only ₹${(remaining / 100).toFixed(0)} remains refundable on this order.`,
    );
  }

  const result = await applyRefund(payment.gatewayPaymentId, amount, input.reason, adminId);

  applyRefundToOrderPricing(order, amount);
  order.statusHistory.push({
    status: order.status,
    changedBy: new Types.ObjectId(adminId),
    changedByRole: 'admin',
    note: `Refund initiated: ₹${(amount / 100).toFixed(0)} — ${input.reason}`,
    at: new Date(),
  });
  await order.save();

  return result;
}
