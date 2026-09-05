import type {
  NotificationListQuery,
  NotificationListResult,
  NotificationPayload,
  NotificationPreferencesInput,
} from '@clenzy/shared';
import { Notification, type NotificationDocument } from '../../models/Notification.js';
import { User } from '../../models/User.js';
import { AppError } from '../../utils/AppError.js';

type NotificationLean = NotificationDocument & { _id: unknown };

function toPayload(notification: NotificationLean): NotificationPayload {
  return {
    id: String(notification._id),
    type: notification.type,
    channel: notification.channel,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    status: notification.status,
    readAt: notification.readAt?.toISOString(),
    createdAt: notification.createdAt.toISOString(),
  };
}

/** See docs/API_SPEC.md §9 — GET /notifications. In-app rows only — email/sms rows are delivery records, not inbox items. */
export async function listNotifications(
  userId: string,
  query: NotificationListQuery,
): Promise<NotificationListResult> {
  const filter = {
    userId,
    channel: 'in_app',
    ...(query.unreadOnly ? { readAt: { $exists: false } } : {}),
  };
  const skip = (query.page - 1) * query.pageSize;

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications: notifications.map(toPayload),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, channel: 'in_app', readAt: { $exists: false } });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const result = await Notification.updateOne(
    { _id: notificationId, userId, channel: 'in_app' },
    { $set: { status: 'read', readAt: new Date() } },
  );
  if (result.matchedCount === 0) throw AppError.notFound('Notification not found.');
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await Notification.updateMany(
    { userId, channel: 'in_app', readAt: { $exists: false } },
    { $set: { status: 'read', readAt: new Date() } },
  );
}

/** See docs/API_SPEC.md §9 — PATCH /notifications/preferences. Writes into the User's existing embedded `notificationPrefs`. */
export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferencesInput,
): Promise<void> {
  const set: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) set[`notificationPrefs.${key}`] = value;
  }
  if (Object.keys(set).length === 0) return;

  const result = await User.updateOne({ _id: userId }, { $set: set });
  if (result.matchedCount === 0) throw AppError.notFound('User not found.');
}
