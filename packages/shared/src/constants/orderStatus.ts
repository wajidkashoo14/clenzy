/**
 * Order lifecycle states. See docs/PAYMENTS_AND_NOTIFICATIONS.md §2 for the full
 * state diagram and the role transition matrix. Status changes must always go
 * through the single transition service described there — never assigned directly.
 */
export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
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
  'CANCELLED',
  'PICKUP_FAILED',
  'DELIVERY_FAILED',
  'REFUND_PENDING',
  'REFUNDED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
];

/**
 * Human-readable labels — the single source of truth shared by the API
 * (order-tracking's `statusLabel`) and the web app (`lib/orderStatus.ts`'s
 * `ORDER_STATUS_META`, which adds icon/color on top of these).
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Payment pending',
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  PICKED_UP: 'Picked up',
  PROCESSING: 'Processing',
  QUALITY_CHECK: 'Quality check',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PICKUP_FAILED: 'Pickup failed',
  DELIVERY_FAILED: 'Delivery failed',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
};

export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refund_pending',
  'partially_refunded',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
