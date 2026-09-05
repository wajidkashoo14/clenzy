import { MSG91_TEMPLATE_IDS, NOTIFICATION_TIMING } from '../config/notifications.js';
import { logger } from '../config/logger.js';
import { emailAdapter } from '../integrations/resend/index.js';
import { smsAdapter } from '../integrations/msg91/index.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

function nextRetryAt(attempts: number): Date {
  const minutes = NOTIFICATION_TIMING.retryBackoffMinutes[attempts] ?? 120;
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * See docs/PAYMENTS_AND_NOTIFICATIONS.md §3.3 — retries failed email/SMS
 * sends with exponential backoff, max 3 attempts, then leaves it failed and
 * logs a critical alert (no in-app admin-alert system exists yet to page).
 * In-app rows never fail in a way retrying helps (they're a plain DB write
 * already committed), so only email/sms are queried here. Rows failed for
 * `NO_DLT_TEMPLATE` are permanently skipped — that's a config gap, not a
 * transient error, and retrying it changes nothing until a human fixes it.
 */
export async function retryFailedNotifications(): Promise<{ retried: number; gaveUp: number }> {
  const due = await Notification.find({
    channel: { $in: ['email', 'sms'] },
    status: 'failed',
    error: { $ne: 'NO_DLT_TEMPLATE' },
    attempts: { $lt: NOTIFICATION_TIMING.maxAttempts },
    nextRetryAt: { $lte: new Date() },
  });

  let retried = 0;
  let gaveUp = 0;

  for (const notification of due) {
    const user = await User.findById(notification.userId);
    if (!user) continue;

    try {
      if (notification.channel === 'email') {
        if (!user.email) throw new Error('User has no email on retry');
        const html = (notification.data as { html?: string } | undefined)?.html ?? '';
        const result = await emailAdapter.sendEmail(user.email, notification.title, html);
        await Notification.updateOne(
          { _id: notification._id },
          { $set: { status: 'sent', sentAt: new Date(), providerMessageId: result.messageId } },
        );
      } else {
        const templateId = MSG91_TEMPLATE_IDS[notification.type];
        if (!templateId) {
          await Notification.updateOne(
            { _id: notification._id },
            { $set: { status: 'failed', error: 'NO_DLT_TEMPLATE' } },
          );
          continue;
        }
        const variables =
          (notification.data as { variables?: Record<string, string> } | undefined)?.variables ??
          {};
        const result = await smsAdapter.sendTransactionalSms(user.phone, templateId, variables);
        await Notification.updateOne(
          { _id: notification._id },
          { $set: { status: 'sent', sentAt: new Date(), providerMessageId: result.messageId } },
        );
      }
      retried += 1;
    } catch (err) {
      const attempts = notification.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);
      const givingUp = attempts >= NOTIFICATION_TIMING.maxAttempts;
      await Notification.updateOne(
        { _id: notification._id },
        {
          $set: { error: message, ...(givingUp ? {} : { nextRetryAt: nextRetryAt(attempts) }) },
          $inc: { attempts: 1 },
        },
      );
      if (givingUp) {
        gaveUp += 1;
        logger.error(
          {
            notificationId: String(notification._id),
            type: notification.type,
            channel: notification.channel,
          },
          'Notification permanently failed after max retries',
        );
      }
    }
  }

  if (retried > 0 || gaveUp > 0) logger.info({ retried, gaveUp }, 'Notification retry cron ran');
  return { retried, gaveUp };
}
