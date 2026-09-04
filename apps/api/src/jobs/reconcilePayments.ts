import { PAYMENT_TIMING } from '../config/payments.js';
import { logger } from '../config/logger.js';
import { razorpayAdapter } from '../integrations/razorpay/index.js';
import { Payment } from '../models/Payment.js';
import { handlePaymentCaptured, handlePaymentFailed } from '../services/webhooks.service.js';

/**
 * See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5 "Webhook never arrives" —
 * mandatory backstop for lost webhooks. Queries Razorpay directly for any
 * payment stuck in `created`/`authorized` past the staleness window, then
 * runs it through the exact same transition functions the webhook handler
 * uses, so the two entry points can never disagree about what "captured"
 * means for our data model.
 */
export async function reconcilePayments(): Promise<{ reconciled: number }> {
  const cutoff = new Date(Date.now() - PAYMENT_TIMING.reconciliationStalenessMinutes * 60 * 1000);
  const stalePayments = await Payment.find({
    gateway: 'razorpay',
    status: { $in: ['created', 'authorized'] },
    createdAt: { $lt: cutoff },
    gatewayOrderId: { $exists: true, $ne: null },
  });

  let reconciled = 0;
  for (const payment of stalePayments) {
    const gatewayOrderId = payment.gatewayOrderId;
    if (!gatewayOrderId) continue;

    try {
      const gatewayPayments = await razorpayAdapter.fetchOrderPayments(gatewayOrderId);
      const captured = gatewayPayments.find((p) => p.status === 'captured');
      const failed = gatewayPayments.find((p) => p.status === 'failed');

      if (captured) {
        await handlePaymentCaptured({
          id: captured.id,
          order_id: gatewayOrderId,
          amount: captured.amount,
          status: captured.status,
        });
        reconciled += 1;
      } else if (failed) {
        await handlePaymentFailed({
          id: failed.id,
          order_id: gatewayOrderId,
          amount: failed.amount,
          status: failed.status,
        });
        reconciled += 1;
      }
      // Neither: genuinely still unresolved (customer hasn't paid) — leave as is for the next run.
    } catch (err) {
      logger.error(
        { err, paymentId: String(payment._id), gatewayOrderId },
        'Reconciliation failed for one payment',
      );
    }
  }

  if (reconciled > 0) logger.info({ reconciled }, 'Reconciled stale payments against Razorpay');
  return { reconciled };
}
