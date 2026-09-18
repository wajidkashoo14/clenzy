import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';

/**
 * Pure HMAC verification — no gateway API call, so unlike
 * `integrations/razorpay/`, this always runs for real, even when the fake
 * order/payment adapter is active. Both sides of the HMAC (Clenzy signs
 * simulated webhooks with the same `RAZORPAY_WEBHOOK_SECRET` it verifies
 * against) are under our control in dev, so this code path is genuinely
 * exercised rather than mocked away — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §1.3 "Signature verification".
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  // Razorpay's own SDK helper — it's the one piece of this file actually tied to their API shape.
  return Razorpay.validateWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
}

/** The dev payment simulator's counterpart to `verifyWebhookSignature` — see routes/dev.route.ts. */
export function signWebhookPayload(rawBody: string): string {
  return createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
}

function constantTimeHexEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** `HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)` — Razorpay's documented checkout-callback formula. */
export function verifyCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  try {
    return constantTimeHexEquals(expected, signature);
  } catch {
    return false;
  }
}
