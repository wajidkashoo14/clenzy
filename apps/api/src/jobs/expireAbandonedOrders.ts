import mongoose from 'mongoose';
import { PAYMENT_TIMING } from '../config/payments.js';
import { logger } from '../config/logger.js';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { releaseSlot } from '../services/orders.service.js';
import { changeStatus } from '../services/orderStatus.service.js';

/**
 * See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5 "User abandons checkout" — an
 * online order stuck at PENDING_PAYMENT past the expiry window is cancelled,
 * its slot capacity released, and its coupon usage reversed. Each order is
 * handled in its own transaction so a failure on one doesn't block the rest.
 */
export async function expireAbandonedOrders(): Promise<{ expired: number }> {
  const cutoff = new Date(Date.now() - PAYMENT_TIMING.abandonedOrderExpiryMinutes * 60 * 1000);
  const staleOrders = await Order.find({
    status: 'PENDING_PAYMENT',
    createdAt: { $lt: cutoff },
  }).select('_id orderNumber');

  let expired = 0;
  for (const stale of staleOrders) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Re-check inside the transaction — a webhook may have resolved it since the query above.
        const order = await Order.findOne({ _id: stale._id, status: 'PENDING_PAYMENT' }).session(
          session,
        );
        if (!order) return;

        await releaseSlot(
          'pickup',
          order.pickupSlot.date,
          order.pickupSlot.window,
          String(order.pickupSlot.areaId),
          session,
        );
        await releaseSlot(
          'delivery',
          order.deliverySlot.date,
          order.deliverySlot.window,
          String(order.deliverySlot.areaId),
          session,
        );

        if (order.couponId) {
          await Coupon.updateOne({ _id: order.couponId }, { $inc: { usedCount: -1 } }).session(
            session,
          );
          await CouponRedemption.deleteOne({ orderId: order._id }).session(session);
        }

        order.cancellation = {
          reason: 'payment_timeout',
          cancelledByRole: 'system',
          at: new Date(),
          refundEligible: false,
        };
        await changeStatus(order, 'CANCELLED', 'system', {
          note: `Abandoned checkout — expired after ${PAYMENT_TIMING.abandonedOrderExpiryMinutes} minutes`,
          session,
        });

        await Payment.updateMany(
          { orderId: order._id, status: 'created' },
          { $set: { failureReason: 'Abandoned — payment window expired' } },
        ).session(session);
      });
      expired += 1;
    } catch (err) {
      logger.error({ err, orderNumber: stale.orderNumber }, 'Failed to expire an abandoned order');
    } finally {
      await session.endSession();
    }
  }

  if (expired > 0) logger.info({ expired }, 'Expired abandoned orders');
  return { expired };
}
