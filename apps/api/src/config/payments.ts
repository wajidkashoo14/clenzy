/** Timing constants from docs/PAYMENTS_AND_NOTIFICATIONS.md §1.5 "Failure and edge cases". */
export const PAYMENT_TIMING = {
  /** A `PENDING_PAYMENT` order older than this is abandoned. */
  abandonedOrderExpiryMinutes: 30,
  /** How often the expiry cron runs. */
  expiryCronSchedule: '*/10 * * * *',
  /** A payment stuck in `created`/`authorized` older than this needs reconciling. */
  reconciliationStalenessMinutes: 10,
  /** How often the reconciliation cron runs. */
  reconciliationCronSchedule: '*/15 * * * *',
} as const;
