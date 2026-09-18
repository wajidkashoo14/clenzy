import type { NotificationType } from '@clenzy/shared';
import { env } from './env.js';

/** DLT template id per SMS-justified event — see docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2 and env.ts. */
export const MSG91_TEMPLATE_IDS: Partial<Record<NotificationType, string>> = {
  order_placed: env.MSG91_TEMPLATE_ORDER_PLACED,
  payment_failed: env.MSG91_TEMPLATE_PAYMENT_FAILED,
  pickup_reminder: env.MSG91_TEMPLATE_PICKUP_REMINDER,
  price_revision_needed: env.MSG91_TEMPLATE_PRICE_REVISION,
  out_for_delivery: env.MSG91_TEMPLATE_OUT_FOR_DELIVERY,
  pickup_failed: env.MSG91_TEMPLATE_PICKUP_DELIVERY_FAILED,
  delivery_failed: env.MSG91_TEMPLATE_PICKUP_DELIVERY_FAILED,
  order_cancelled: env.MSG91_TEMPLATE_ORDER_CANCELLED,
  refund_completed: env.MSG91_TEMPLATE_REFUND_COMPLETED,
};

/** Timing/retry constants for the notification system — see PAYMENTS_AND_NOTIFICATIONS.md §3.3. */
export const NOTIFICATION_TIMING = {
  /** Max delivery attempts before a channel send is left as permanently failed. */
  maxAttempts: 3,
  /** Backoff between retries, indexed by attempt number (0-based). */
  retryBackoffMinutes: [5, 30, 120],
  /** How often the retry cron runs. */
  retryCronSchedule: '*/5 * * * *',
  /** Evening-before pickup reminders — see the matrix's "Pickup reminder" row. */
  pickupReminderCronSchedule: '0 18 * * *',
  /** One review-request email, 24h after delivery — "Never nag". */
  reviewRequestDelayHours: 24,
  reviewRequestCronSchedule: '0 * * * *',
} as const;
