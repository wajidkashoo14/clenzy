import { logger } from '../config/logger.js';
import { Notification } from '../models/Notification.js';
import { Order } from '../models/Order.js';
import { sendNotification } from '../services/notifications/notificationService.js';
import { addDaysToDateString, nowInKolkata } from '../utils/timezone.js';

/**
 * See docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2 "Pickup reminder (evening
 * before)" — runs once daily; see config/notifications.ts's
 * `pickupReminderCronSchedule`. Dedupes via the notifications collection
 * itself rather than a flag on Order, since it's the one source of truth
 * for "did we already tell this user about this."
 */
export async function sendPickupReminders(): Promise<{ sent: number }> {
  const tomorrow = addDaysToDateString(nowInKolkata().dateString, 1);
  const candidates = await Order.find({
    'pickupSlot.date': tomorrow,
    status: { $in: ['CONFIRMED', 'PICKUP_SCHEDULED'] },
  }).select('_id orderNumber userId pickupSlot.window');

  let sent = 0;
  for (const order of candidates) {
    const alreadySent = await Notification.exists({ orderId: order._id, type: 'pickup_reminder' });
    if (alreadySent) continue;

    await sendNotification({
      userId: String(order.userId),
      type: 'pickup_reminder',
      orderId: String(order._id),
      data: { orderNumber: order.orderNumber, pickupWindow: order.pickupSlot.window },
    });
    sent += 1;
  }

  if (sent > 0) logger.info({ sent }, 'Pickup reminders sent');
  return { sent };
}
