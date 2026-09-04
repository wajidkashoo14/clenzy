import { schedule } from 'node-cron';
import { PAYMENT_TIMING } from '../config/payments.js';
import { logger } from '../config/logger.js';
import { expireAbandonedOrders } from './expireAbandonedOrders.js';
import { reconcilePayments } from './reconcilePayments.js';

/**
 * Started from server.ts only — never from app.ts, which `createApp()` also
 * builds for tests, and running these on a timer during every test file
 * would be pure noise. `noOverlap` guards against a slow run (e.g. many
 * stale payments) still executing when the next tick fires.
 */
export function startScheduledJobs(): void {
  schedule(
    PAYMENT_TIMING.expiryCronSchedule,
    () => {
      expireAbandonedOrders().catch((err: unknown) =>
        logger.error({ err }, 'expireAbandonedOrders cron failed'),
      );
    },
    { name: 'expire-abandoned-orders', noOverlap: true },
  );

  schedule(
    PAYMENT_TIMING.reconciliationCronSchedule,
    () => {
      reconcilePayments().catch((err: unknown) =>
        logger.error({ err }, 'reconcilePayments cron failed'),
      );
    },
    { name: 'reconcile-payments', noOverlap: true },
  );

  logger.info('Scheduled payment jobs started (expiry every 10 min, reconciliation every 15 min)');
}
