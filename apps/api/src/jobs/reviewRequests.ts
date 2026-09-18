import { NOTIFICATION_TIMING } from '../config/notifications.js';
import { logger } from '../config/logger.js';
import { Notification } from '../models/Notification.js';
import { Order } from '../models/Order.js';
import { sendNotification } from '../services/notifications/notificationService.js';

/**
 * See docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2 "Review request — one email
 * only, 24h after delivery. Never nag." Runs hourly (see
 * config/notifications.ts) and only ever sends once per order, enforced by
 * checking the notifications collection rather than a flag on Order.
 */
export async function sendReviewRequests(): Promise<{ sent: number }> {
  const cutoff = new Date(
    Date.now() - NOTIFICATION_TIMING.reviewRequestDelayHours * 60 * 60 * 1000,
  );
  const candidates = await Order.find({
    status: { $in: ['DELIVERED', 'COMPLETED'] },
    deliveredAt: { $lte: cutoff },
  }).select('_id orderNumber userId');

  let sent = 0;
  for (const order of candidates) {
    const alreadySent = await Notification.exists({ orderId: order._id, type: 'review_request' });
    if (alreadySent) continue;

    await sendNotification({
      userId: String(order.userId),
      type: 'review_request',
      orderId: String(order._id),
      data: { orderNumber: order.orderNumber },
    });
    sent += 1;
  }

  if (sent > 0) logger.info({ sent }, 'Review requests sent');
  return { sent };
}
