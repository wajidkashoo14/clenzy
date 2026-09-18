import { randomBytes } from 'node:crypto';
import { logger } from '../../config/logger.js';
import type {
  CreateOrderParams,
  CreateRefundParams,
  GatewayOrder,
  GatewayPayment,
  GatewayRefund,
  PaymentGatewayAdapter,
} from './types.js';

/**
 * Fake adapter used until Razorpay KYC clears — see docs/INTEGRATIONS.md §2.2
 * and docs/DEVELOPMENT_PLAN.md Phase 8. Generates plausible-looking fake ids
 * instead of calling Razorpay's API, and logs what it would have done.
 *
 * There is no real checkout to open against a fake order, so the frontend's
 * `/checkout/processing` page falls back to a clearly-labeled payment
 * simulator when `NEXT_PUBLIC_RAZORPAY_KEY_ID` is unset — it drives the
 * *real* webhook-processing code path with a correctly HMAC-signed payload
 * (using RAZORPAY_WEBHOOK_SECRET, which has a dev default), so that code is
 * genuinely exercised rather than bypassed. `fetchOrderPayments`/
 * `fetchPayment` have nothing to report here since no real gateway ever saw
 * these ids — the reconciliation job's tests inject a payment history
 * directly rather than depending on this adapter's memory.
 */
export function createConsoleRazorpayAdapter(): PaymentGatewayAdapter {
  return {
    createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
      const id = `order_fake_${randomBytes(12).toString('hex')}`;
      logger.info(
        { id, amount: params.amount, receipt: params.receipt },
        '[fake Razorpay] order created',
      );
      return Promise.resolve({ id, amount: params.amount, status: 'created' });
    },

    fetchOrderPayments(gatewayOrderId: string): Promise<GatewayPayment[]> {
      logger.info({ gatewayOrderId }, '[fake Razorpay] fetchOrderPayments — nothing to report');
      return Promise.resolve([]);
    },

    fetchPayment(paymentId: string): Promise<GatewayPayment> {
      return Promise.reject(
        new Error(
          `[fake Razorpay] fetchPayment(${paymentId}) has no real gateway state to return.`,
        ),
      );
    },

    createRefund(params: CreateRefundParams): Promise<GatewayRefund> {
      const id = `rfnd_fake_${randomBytes(12).toString('hex')}`;
      logger.info(
        { id, paymentId: params.paymentId, amount: params.amount },
        '[fake Razorpay] refund created',
      );
      return Promise.resolve({ id, amount: params.amount ?? 0, status: 'processed' });
    },
  };
}
