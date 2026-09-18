import { randomBytes } from 'node:crypto';
import { env, isProduction } from '../config/env.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { AppError } from '../utils/AppError.js';
import { signWebhookPayload } from '../utils/razorpaySignature.js';
import { handleRazorpayWebhook } from './webhooks.service.js';

/**
 * There's no real hosted checkout to open against a fake Razorpay order, so
 * this drives the actual webhook-processing pipeline with a
 * correctly-signed simulated payload — the same code path a real webhook
 * hits, not a shortcut around it. Only reachable in dev/test, and only
 * while the fake adapter is active (no real RAZORPAY_KEY_ID configured);
 * otherwise this is indistinguishable from a route that doesn't exist.
 */
export function isDevPaymentSimulatorAvailable(): boolean {
  return !isProduction && !env.RAZORPAY_KEY_ID;
}

export async function simulatePayment(
  userId: string,
  orderNumber: string,
  outcome: 'success' | 'failure',
): Promise<{ orderStatus: string; paymentStatus: string }> {
  if (!isDevPaymentSimulatorAvailable()) throw AppError.notFound('Resource not found.');

  const order = await Order.findOne({ orderNumber, userId }).lean();
  if (!order) throw AppError.notFound('Order not found.');
  if (order.paymentMethod !== 'online' || order.status !== 'PENDING_PAYMENT') {
    throw AppError.unprocessable(
      'SIMULATION_NOT_APPLICABLE',
      'This order is not awaiting an online payment.',
    );
  }

  const payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 }).lean();
  if (!payment?.gatewayOrderId) {
    throw AppError.unprocessable(
      'NO_GATEWAY_ORDER',
      'No gateway order exists for this payment yet.',
    );
  }

  const fakePaymentId = `pay_fake_${randomBytes(10).toString('hex')}`;
  const entity =
    outcome === 'success'
      ? {
          id: fakePaymentId,
          order_id: payment.gatewayOrderId,
          amount: order.pricing.grandTotal,
          status: 'captured',
        }
      : {
          id: fakePaymentId,
          order_id: payment.gatewayOrderId,
          amount: order.pricing.grandTotal,
          status: 'failed',
          error_description: 'Simulated payment failure',
        };
  const rawBody = JSON.stringify({
    event: outcome === 'success' ? 'payment.captured' : 'payment.failed',
    payload: { payment: { entity } },
  });

  await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));

  const updated = await Order.findOne({ orderNumber, userId }).lean();
  if (!updated) throw AppError.notFound('Order not found.');
  return { orderStatus: updated.status, paymentStatus: updated.paymentStatus };
}
