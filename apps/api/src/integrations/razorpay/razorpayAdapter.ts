import Razorpay from 'razorpay';
import { env } from '../../config/env.js';
import type {
  CreateOrderParams,
  CreateRefundParams,
  GatewayOrder,
  GatewayPayment,
  GatewayRefund,
  PaymentGatewayAdapter,
} from './types.js';

/**
 * Real Razorpay adapter — only constructed when RAZORPAY_KEY_ID/SECRET are
 * set (see ./index.ts). NOT yet exercised against a real Razorpay account
 * (KYC pending — see docs/INTEGRATIONS.md §2.2). Verify against Razorpay's
 * current API docs before relying on this in production.
 */
export function createRazorpayAdapter(): PaymentGatewayAdapter {
  const client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });

  return {
    async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
      const order = await client.orders.create({
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
      });
      return { id: order.id, amount: Number(order.amount), status: order.status };
    },

    async fetchOrderPayments(gatewayOrderId: string): Promise<GatewayPayment[]> {
      const { items } = await client.orders.fetchPayments(gatewayOrderId);
      return items.map((payment) => ({
        id: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount),
        status: payment.status,
      }));
    },

    async fetchPayment(paymentId: string): Promise<GatewayPayment> {
      const payment = await client.payments.fetch(paymentId);
      return {
        id: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount),
        status: payment.status,
      };
    },

    async createRefund(params: CreateRefundParams): Promise<GatewayRefund> {
      const refund = await client.payments.refund(params.paymentId, {
        amount: params.amount,
        speed: 'normal',
      });
      return { id: refund.id, amount: Number(refund.amount), status: refund.status };
    },
  };
}
