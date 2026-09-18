/**
 * See docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2 "Notification matrix". Each
 * type's channel list is the MAXIMUM the business rules allow — user
 * preferences and admin per-event toggles can only narrow it further, never
 * widen it. WhatsApp and push are V2 (not implemented) and deliberately
 * absent here.
 */
export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  'signup_welcome',
  'order_placed',
  'payment_failed',
  'order_confirmed',
  'pickup_scheduled',
  'pickup_reminder',
  'picked_up',
  'price_revision_needed',
  'processing_started',
  'ready_for_delivery',
  'out_for_delivery',
  'delivered',
  'pickup_failed',
  'delivery_failed',
  'order_cancelled',
  'refund_initiated',
  'refund_completed',
  'order_completed',
  'review_request',
  'reclean_accepted',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** The channel set the matrix allows for each event — see PAYMENTS_AND_NOTIFICATIONS.md §3.2. */
export const NOTIFICATION_MATRIX: Record<NotificationType, NotificationChannel[]> = {
  signup_welcome: ['in_app', 'email'],
  order_placed: ['in_app', 'email', 'sms'],
  payment_failed: ['in_app', 'email', 'sms'],
  order_confirmed: ['in_app'],
  pickup_scheduled: ['in_app', 'email'],
  pickup_reminder: ['in_app', 'sms'],
  picked_up: ['in_app', 'email'],
  price_revision_needed: ['in_app', 'email', 'sms'],
  processing_started: ['in_app'],
  ready_for_delivery: ['in_app', 'email'],
  out_for_delivery: ['in_app', 'sms'],
  delivered: ['in_app', 'email'],
  pickup_failed: ['in_app', 'email', 'sms'],
  delivery_failed: ['in_app', 'email', 'sms'],
  order_cancelled: ['in_app', 'email', 'sms'],
  refund_initiated: ['in_app', 'email'],
  refund_completed: ['in_app', 'email', 'sms'],
  order_completed: ['in_app'],
  review_request: ['in_app', 'email'],
  reclean_accepted: ['in_app', 'email'],
};

/** Events an admin can tune the paid-channel spend on — the ones with email and/or sms in the matrix. */
export const ADMIN_TOGGLEABLE_TYPES: NotificationType[] = NOTIFICATION_TYPES.filter(
  (type) => NOTIFICATION_MATRIX[type].length > 1,
);

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  signup_welcome: 'Welcome',
  order_placed: 'Order placed',
  payment_failed: 'Payment failed',
  order_confirmed: 'Order confirmed',
  pickup_scheduled: 'Pickup scheduled',
  pickup_reminder: 'Pickup reminder',
  picked_up: 'Picked up',
  price_revision_needed: 'Price revision — approval needed',
  processing_started: 'Processing started',
  ready_for_delivery: 'Ready for delivery',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  pickup_failed: 'Pickup failed',
  delivery_failed: 'Delivery failed',
  order_cancelled: 'Order cancelled',
  refund_initiated: 'Refund initiated',
  refund_completed: 'Refund completed',
  order_completed: 'Order completed',
  review_request: 'Review request',
  reclean_accepted: 'Re-clean accepted',
};
