import type { OrderDocument } from '../../models/Order.js';
import { sendNotification } from './notificationService.js';

type OrderLike = OrderDocument & { _id: unknown };

/**
 * Called once a refund has been submitted to the gateway (after
 * `applyRefund()` succeeds) and the caller's own `applyRefundToOrderPricing`
 * + save has run — see docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2's separate
 * "Refund initiated"/"Refund completed" rows. `amount` is this specific
 * refund's amount, not the order's running total.
 */
export async function notifyRefund(order: OrderLike, amount: number): Promise<void> {
  const userId = String(order.userId);
  const orderId = String(order._id);
  const orderNumber = order.orderNumber;

  await sendNotification({
    userId,
    type: 'refund_initiated',
    orderId,
    data: { orderNumber, amount },
  });

  if (order.paymentStatus === 'refunded') {
    await sendNotification({
      userId,
      type: 'refund_completed',
      orderId,
      data: { orderNumber, amount: order.pricing.amountRefunded },
    });
  }
}
