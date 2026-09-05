import type { OrderStatus } from '@clenzy/shared';
import type { OrderDocument } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { sendNotification } from './notificationService.js';

/** Accepts either a live Mongoose document or a `.toObject()`/`.lean()` result — only field reads happen here, no document methods. */
type OrderLike = OrderDocument & { _id: unknown };

/**
 * Maps a `changeStatus()` transition to the matching notification event —
 * see docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2. Called fire-and-forget by
 * `orderStatus.service.ts` when there's no active transaction; call sites
 * that pass a `session` to `changeStatus()` must call this themselves once
 * their transaction has committed (see that file's comment for why).
 * QUALITY_CHECK, PENDING_PAYMENT, REFUND_PENDING and REFUNDED intentionally
 * fire nothing here — the matrix marks quality-check internal-only, and the
 * refund pair is notified directly from payments.service.ts instead (order
 * status rarely reaches those two in the currently-wired flows).
 */
export async function notifyOrderStatusChange(order: OrderLike, to: OrderStatus): Promise<void> {
  const orderId = String(order._id);
  const userId = String(order.userId);
  const orderNumber = order.orderNumber;

  switch (to) {
    case 'PLACED':
      await sendNotification({
        userId,
        type: 'order_placed',
        orderId,
        data: {
          orderNumber,
          pickupDate: order.pickupSlot.date,
          pickupWindow: order.pickupSlot.window,
          grandTotal: order.pricing.grandTotal,
          paymentMethod: order.paymentMethod,
        },
      });
      return;
    case 'CONFIRMED':
      await sendNotification({ userId, type: 'order_confirmed', orderId, data: { orderNumber } });
      return;
    case 'PICKUP_SCHEDULED': {
      const agent = order.assignedPickupAgentId
        ? await User.findById(order.assignedPickupAgentId).select('name').lean()
        : null;
      await sendNotification({
        userId,
        type: 'pickup_scheduled',
        orderId,
        data: {
          orderNumber,
          pickupDate: order.pickupSlot.date,
          pickupWindow: order.pickupSlot.window,
          agentName: agent?.name,
        },
      });
      return;
    }
    case 'PICKED_UP':
      await sendNotification({
        userId,
        type: 'picked_up',
        orderId,
        data: {
          orderNumber,
          items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
        },
      });
      return;
    case 'PROCESSING':
      await sendNotification({
        userId,
        type: 'processing_started',
        orderId,
        data: { orderNumber },
      });
      return;
    case 'READY':
      await sendNotification({
        userId,
        type: 'ready_for_delivery',
        orderId,
        data: {
          orderNumber,
          deliveryDate: order.deliverySlot.date,
          deliveryWindow: order.deliverySlot.window,
        },
      });
      return;
    case 'OUT_FOR_DELIVERY': {
      const agent = order.assignedDeliveryAgentId
        ? await User.findById(order.assignedDeliveryAgentId).select('name phone').lean()
        : null;
      const codAmount =
        order.paymentMethod === 'cod'
          ? order.pricing.grandTotal - order.pricing.amountPaid
          : undefined;
      await sendNotification({
        userId,
        type: 'out_for_delivery',
        orderId,
        data: { orderNumber, agentName: agent?.name, agentPhone: agent?.phone, codAmount },
      });
      return;
    }
    case 'DELIVERED':
      await sendNotification({
        userId,
        type: 'delivered',
        orderId,
        data: { orderNumber, grandTotal: order.pricing.grandTotal },
      });
      return;
    case 'COMPLETED':
      await sendNotification({ userId, type: 'order_completed', orderId, data: { orderNumber } });
      return;
    case 'CANCELLED':
      await sendNotification({
        userId,
        type: 'order_cancelled',
        orderId,
        data: {
          orderNumber,
          reason:
            order.cancellation?.reason ?? order.statusHistory.at(-1)?.note ?? 'No reason given',
          refundEligible: order.cancellation?.refundEligible ?? false,
        },
      });
      return;
    case 'PICKUP_FAILED':
      await sendNotification({
        userId,
        type: 'pickup_failed',
        orderId,
        data: {
          orderNumber,
          type: 'pickup',
          reason: order.statusHistory.at(-1)?.note ?? 'unspecified',
        },
      });
      return;
    case 'DELIVERY_FAILED':
      await sendNotification({
        userId,
        type: 'delivery_failed',
        orderId,
        data: {
          orderNumber,
          type: 'delivery',
          reason: order.statusHistory.at(-1)?.note ?? 'unspecified',
        },
      });
      return;
    default:
      return;
  }
}
