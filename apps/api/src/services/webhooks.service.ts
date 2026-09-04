import { createHash } from 'node:crypto';
import { logger } from '../config/logger.js';
import { razorpayAdapter } from '../integrations/razorpay/index.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { changeStatus } from './orderStatus.service.js';
import { verifyWebhookSignature } from '../utils/razorpaySignature.js';

export interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  error_description?: string;
}
interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}
interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    refund?: { entity: RazorpayRefundEntity };
  };
}

export interface WebhookProcessResult {
  status: 200 | 400;
  reason?: string;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/** See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5 "Duplicate payment (user pays twice)". */
async function handleDuplicatePayment(
  orderNumber: string,
  entity: RazorpayPaymentEntity,
): Promise<void> {
  logger.error(
    { orderNumber, paymentId: entity.id },
    'Duplicate payment.captured for an already-paid order — auto-refunding',
  );
  await razorpayAdapter.createRefund({ paymentId: entity.id, amount: entity.amount });
}

/** Exported for the reconciliation job — see jobs/reconcilePayments.ts. Same transition, two entry points. */
export async function handlePaymentCaptured(entity: RazorpayPaymentEntity): Promise<void> {
  const payment = await Payment.findOne({ gatewayOrderId: entity.order_id }).sort({
    createdAt: -1,
  });
  if (!payment) {
    logger.warn(
      { gatewayOrderId: entity.order_id },
      'payment.captured for an unknown gatewayOrderId',
    );
    return;
  }
  const order = await Order.findById(payment.orderId);
  if (!order) return;

  if (order.paymentStatus === 'paid') {
    await handleDuplicatePayment(order.orderNumber, entity);
    return;
  }

  if (entity.amount !== order.pricing.grandTotal) {
    // The classic tampering signature — see docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5. Never mark paid on a mismatch.
    logger.error(
      { orderNumber: order.orderNumber, expected: order.pricing.grandTotal, got: entity.amount },
      'Captured amount does not match order total — flagging, not marking paid',
    );
    payment.status = 'failed';
    payment.failureReason = 'AMOUNT_MISMATCH';
    await payment.save();
    return;
  }

  payment.status = 'captured';
  payment.gatewayPaymentId = entity.id;
  payment.webhookEvents.push({
    event: 'payment.captured',
    payload: entity,
    receivedAt: new Date(),
  });
  await payment.save();

  order.paymentStatus = 'paid';
  order.pricing.amountPaid = entity.amount;
  await changeStatus(order, 'PLACED', 'system', { note: 'Payment captured' });
}

/** Exported for the reconciliation job — see jobs/reconcilePayments.ts. */
export async function handlePaymentFailed(entity: RazorpayPaymentEntity): Promise<void> {
  const payment = await Payment.findOne({ gatewayOrderId: entity.order_id }).sort({
    createdAt: -1,
  });
  if (!payment) return;
  const order = await Order.findById(payment.orderId);
  // Already resolved by an earlier/concurrent success — don't regress it.
  if (!order || order.paymentStatus === 'paid') return;

  payment.status = 'failed';
  payment.gatewayPaymentId = entity.id;
  payment.failureReason = entity.error_description ?? 'Payment failed';
  payment.webhookEvents.push({ event: 'payment.failed', payload: entity, receivedAt: new Date() });
  await payment.save();

  // Status stays PENDING_PAYMENT — the customer gets a retry CTA. See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5.
  order.paymentStatus = 'failed';
  await order.save();
}

async function handleRefundProcessed(entity: RazorpayRefundEntity): Promise<void> {
  const payment = await Payment.findOne({ gatewayPaymentId: entity.payment_id });
  if (!payment) return;

  const refund = payment.refunds.find((r) => r.refundId === entity.id);
  if (refund) refund.status = 'processed';
  else
    payment.refunds.push({
      refundId: entity.id,
      amount: entity.amount,
      reason: '(via webhook)',
      status: 'processed',
      at: new Date(),
    });
  await payment.save();

  const order = await Order.findById(payment.orderId);
  if (!order) return;
  const totalRefunded = payment.refunds
    .filter((r) => r.status === 'processed')
    .reduce((sum, r) => sum + r.amount, 0);
  order.pricing.amountRefunded = totalRefunded;
  order.paymentStatus =
    totalRefunded >= order.pricing.amountPaid ? 'refunded' : 'partially_refunded';
  await order.save();
}

async function handleRefundFailed(entity: RazorpayRefundEntity): Promise<void> {
  const payment = await Payment.findOne({ gatewayPaymentId: entity.payment_id });
  if (!payment) return;
  const refund = payment.refunds.find((r) => r.refundId === entity.id);
  if (refund) refund.status = 'failed';
  await payment.save();

  const order = await Order.findById(payment.orderId);
  if (!order) return;
  // See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5: "mark REFUND_PENDING, alert admin, retry manually."
  order.paymentStatus = 'refund_pending';
  await order.save();
}

async function processEvent(parsed: RazorpayWebhookPayload): Promise<void> {
  switch (parsed.event) {
    case 'payment.captured':
      if (parsed.payload.payment) await handlePaymentCaptured(parsed.payload.payment.entity);
      return;
    case 'payment.failed':
      if (parsed.payload.payment) await handlePaymentFailed(parsed.payload.payment.entity);
      return;
    case 'refund.processed':
      if (parsed.payload.refund) await handleRefundProcessed(parsed.payload.refund.entity);
      return;
    case 'refund.failed':
      if (parsed.payload.refund) await handleRefundFailed(parsed.payload.refund.entity);
      return;
    default:
      logger.info({ event: parsed.event }, 'Unhandled Razorpay webhook event type');
  }
}

/**
 * See docs/API_SPEC.md §8 and docs/PAYMENTS_AND_NOTIFICATIONS.md §1.3/§1.5.
 * Verifies the signature on the raw bytes before trusting anything, stores
 * every event for dedupe (unique on `{provider, eventId}`), and always
 * returns 200 once the event is durably stored — even if downstream
 * processing throws, since Razorpay retries forever on non-200 and our own
 * reconciliation job is the backstop for anything that fails here.
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signatureHeader: string | undefined,
): Promise<WebhookProcessResult> {
  if (!signatureHeader || !verifyWebhookSignature(rawBody, signatureHeader)) {
    return { status: 400, reason: 'invalid signature' };
  }

  let parsed: RazorpayWebhookPayload;
  try {
    parsed = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return { status: 400, reason: 'invalid JSON body' };
  }

  // Razorpay doesn't send a dedicated delivery id; identical redeliveries produce identical bytes.
  const eventId = createHash('sha256').update(rawBody).digest('hex');

  let webhookEvent;
  try {
    webhookEvent = await WebhookEvent.create({
      provider: 'razorpay',
      eventId,
      eventType: parsed.event,
      signatureValid: true,
      payload: parsed,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      logger.info(
        { eventId, eventType: parsed.event },
        'Duplicate Razorpay webhook — already processed once',
      );
      return { status: 200 };
    }
    throw err;
  }

  try {
    await processEvent(parsed);
    await WebhookEvent.updateOne({ _id: webhookEvent._id }, { $set: { processedAt: new Date() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, eventId, eventType: parsed.event }, 'Razorpay webhook processing failed');
    await WebhookEvent.updateOne({ _id: webhookEvent._id }, { $set: { processingError: message } });
  }

  return { status: 200 };
}
