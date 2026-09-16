import type { NotificationChannel, NotificationType } from '@clenzy/shared';
import { NOTIFICATION_MATRIX } from '@clenzy/shared';
import { Types, type HydratedDocument } from 'mongoose';
import { MSG91_TEMPLATE_IDS, NOTIFICATION_TIMING } from '../../config/notifications.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { emailAdapter } from '../../integrations/resend/index.js';
import { smsAdapter } from '../../integrations/msg91/index.js';
import { Notification } from '../../models/Notification.js';
import { NotificationSettings } from '../../models/NotificationSettings.js';
import { User, type UserDocument } from '../../models/User.js';
import { buildDeliveredNotification } from './templates/delivered.js';
import { buildOrderCancelledNotification } from './templates/orderCancelled.js';
import { buildOrderPlacedNotification } from './templates/orderPlaced.js';
import { buildPaymentFailedNotification } from './templates/paymentFailed.js';
import { buildPickedUpNotification } from './templates/pickedUp.js';
import { buildPickupDeliveryFailedNotification } from './templates/pickupDeliveryFailed.js';
import { buildPickupScheduledNotification } from './templates/pickupScheduled.js';
import { buildPriceRevisionNeededNotification } from './templates/priceRevisionNeeded.js';
import { buildReadyForDeliveryNotification } from './templates/readyForDelivery.js';
import { buildRecleanAcceptedNotification } from './templates/recleanAccepted.js';
import { buildRefundCompletedNotification } from './templates/refundCompleted.js';
import { buildRefundInitiatedNotification } from './templates/refundInitiated.js';
import { buildReviewRequestNotification } from './templates/reviewRequest.js';
import { buildSignupWelcomeNotification } from './templates/signupWelcome.js';
import type { NotificationContent } from './templates/types.js';
import {
  buildOrderConfirmedNotification,
  buildOrderCompletedNotification,
  buildOutForDeliveryNotification,
  buildPickupReminderNotification,
  buildProcessingStartedNotification,
} from './templates/lightweightEvents.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- one registry entry per event, each with its own typed Data shape; a shared generic here would just re-hide the same `any`.
type TemplateBuilder = (data: any) => NotificationContent | Promise<NotificationContent>;

const TEMPLATE_BUILDERS: Record<NotificationType, TemplateBuilder> = {
  signup_welcome: buildSignupWelcomeNotification,
  order_placed: buildOrderPlacedNotification,
  payment_failed: buildPaymentFailedNotification,
  order_confirmed: buildOrderConfirmedNotification,
  pickup_scheduled: buildPickupScheduledNotification,
  pickup_reminder: buildPickupReminderNotification,
  picked_up: buildPickedUpNotification,
  price_revision_needed: buildPriceRevisionNeededNotification,
  processing_started: buildProcessingStartedNotification,
  ready_for_delivery: buildReadyForDeliveryNotification,
  out_for_delivery: buildOutForDeliveryNotification,
  delivered: buildDeliveredNotification,
  pickup_failed: buildPickupDeliveryFailedNotification,
  delivery_failed: buildPickupDeliveryFailedNotification,
  order_cancelled: buildOrderCancelledNotification,
  refund_initiated: buildRefundInitiatedNotification,
  refund_completed: buildRefundCompletedNotification,
  order_completed: buildOrderCompletedNotification,
  review_request: buildReviewRequestNotification,
  reclean_accepted: buildRecleanAcceptedNotification,
};

async function resolveChannels(
  type: NotificationType,
  user: HydratedDocument<UserDocument>,
): Promise<NotificationChannel[]> {
  const allowed = NOTIFICATION_MATRIX[type];
  const settings = await NotificationSettings.findById('global').lean();
  const toggles = settings?.toggles?.[type];

  const channels: NotificationChannel[] = ['in_app'];
  if (
    allowed.includes('email') &&
    user.email &&
    user.notificationPrefs.email &&
    toggles?.email !== false
  ) {
    channels.push('email');
  }
  if (
    allowed.includes('sms') &&
    user.phoneVerified &&
    user.notificationPrefs.sms &&
    toggles?.sms !== false
  ) {
    channels.push('sms');
  }
  return channels;
}

function computeNextRetryAt(attempts: number): Date {
  const minutes = NOTIFICATION_TIMING.retryBackoffMinutes[attempts] ?? 120;
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function dispatchOne(
  user: HydratedDocument<UserDocument>,
  type: NotificationType,
  orderId: string | undefined,
  channel: NotificationChannel,
  content: NotificationContent,
  orderNumber: string | undefined,
): Promise<void> {
  if (channel === 'in_app') {
    // `data.orderNumber` is the deep link the notification center resolves to
    // `/account/orders/:orderNumber` — see PAYMENTS_AND_NOTIFICATIONS.md §3.3
    // "include an order deep link in every message".
    await Notification.create({
      userId: user._id,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      type,
      channel,
      title: content.inApp.title,
      body: content.inApp.body,
      data: orderNumber ? { orderNumber } : undefined,
      status: 'sent',
      sentAt: new Date(),
    });
    return;
  }

  if (channel === 'email') {
    if (!content.email || !user.email) return;
    const notification = await Notification.create({
      userId: user._id,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      type,
      channel,
      title: content.email.subject,
      body: content.email.subject,
      data: { html: content.email.html },
      status: 'queued',
    });
    try {
      const result = await emailAdapter.sendEmail(
        user.email,
        content.email.subject,
        content.email.html,
      );
      await Notification.updateOne(
        { _id: notification._id },
        { $set: { status: 'sent', sentAt: new Date(), providerMessageId: result.messageId } },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await Notification.updateOne(
        { _id: notification._id },
        {
          $set: { status: 'failed', error: message, nextRetryAt: computeNextRetryAt(0) },
          $inc: { attempts: 1 },
        },
      );
    }
    return;
  }

  // sms
  if (!content.sms) return;
  const templateId = MSG91_TEMPLATE_IDS[type];
  const notification = await Notification.create({
    userId: user._id,
    orderId: orderId ? new Types.ObjectId(orderId) : undefined,
    type,
    channel,
    title: content.inApp.title,
    body: content.sms.text,
    data: { variables: content.sms.variables },
    status: 'queued',
  });

  if (!templateId) {
    // DLT approval is an external dependency, not a transient failure —
    // never enters the retry queue. See docs/DEVELOPMENT_PLAN.md Phase 10.
    await Notification.updateOne(
      { _id: notification._id },
      { $set: { status: 'failed', error: 'NO_DLT_TEMPLATE' } },
    );
    return;
  }

  if (!user.phone) {
    // Phone-less user (Google sign-up that hasn't added a number yet) — SMS
    // can never deliver, so fail permanently like the missing-template case.
    // In-app/email still go out above.
    await Notification.updateOne(
      { _id: notification._id },
      { $set: { status: 'failed', error: 'NO_PHONE' } },
    );
    return;
  }

  try {
    const result = await smsAdapter.sendTransactionalSms(
      user.phone,
      templateId,
      content.sms.variables,
    );
    await Notification.updateOne(
      { _id: notification._id },
      { $set: { status: 'sent', sentAt: new Date(), providerMessageId: result.messageId } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: { status: 'failed', error: message, nextRetryAt: computeNextRetryAt(0) },
        $inc: { attempts: 1 },
      },
    );
  }
}

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  orderId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape depends on `type`; each template's own Data interface is the real contract.
  data: any;
}

/**
 * Fire-and-forget — see docs/PAYMENTS_AND_NOTIFICATIONS.md §3.3: never
 * `await` a notification send inside the request path, and never call this
 * from inside a database transaction (a rollback can't un-send a message
 * already written/dispatched). Every failure is caught and logged here so a
 * broken notification never surfaces as a broken business action.
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  try {
    const user = await User.findById(params.userId);
    if (!user) return;

    const channels = await resolveChannels(params.type, user);
    const builder = TEMPLATE_BUILDERS[params.type];
    const content = await builder({ ...params.data, webAppUrl: env.WEB_APP_URL });
    // Every template's Data interface uses one of these two field names for
    // the order it's about — reclean's is a different order than its parent.
    const rawData = params.data as Record<string, unknown> | undefined;
    const orderNumber =
      typeof rawData?.recleanOrderNumber === 'string'
        ? rawData.recleanOrderNumber
        : typeof rawData?.orderNumber === 'string'
          ? rawData.orderNumber
          : undefined;

    for (const channel of channels) {
      await dispatchOne(user, params.type, params.orderId, channel, content, orderNumber).catch(
        (err: unknown) => {
          logger.error(
            { err, type: params.type, channel, userId: params.userId },
            'Notification channel dispatch failed',
          );
        },
      );
    }
  } catch (err) {
    logger.error({ err, type: params.type, userId: params.userId }, 'sendNotification failed');
  }
}
