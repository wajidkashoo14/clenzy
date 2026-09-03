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

export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refund_pending',
  'partially_refunded',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
