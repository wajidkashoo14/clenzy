/** No file outside integrations/razorpay/ may import the `razorpay` SDK directly — see docs/ARCHITECTURE.md §4. */

export interface CreateOrderParams {
  /** Paise. */
  amount: number;
  currency: string;
  /** Clenzy's `orderNumber` — Razorpay's own reference field. */
  receipt: string;
}

export interface GatewayOrder {
  id: string;
  /** Paise. */
  amount: number;
  status: string;
}

export interface GatewayPayment {
  id: string;
  orderId: string;
  /** Paise. */
  amount: number;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
}

export interface CreateRefundParams {
  paymentId: string;
  /** Paise. Omit for a full refund of whatever remains uncaptured. */
  amount?: number;
}

export interface GatewayRefund {
  id: string;
  /** Paise. */
  amount: number;
  status: string;
}

export interface PaymentGatewayAdapter {
  createOrder(params: CreateOrderParams): Promise<GatewayOrder>;
  fetchOrderPayments(gatewayOrderId: string): Promise<GatewayPayment[]>;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  createRefund(params: CreateRefundParams): Promise<GatewayRefund>;
}
