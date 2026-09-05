import type { NotificationChannel, NotificationType } from '@clenzy/shared';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '@clenzy/shared';
import { Schema, model, type Types } from 'mongoose';

/**
 * See docs/DATABASE.md "notifications" and
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §3.3. One row per (event, channel) —
 * an order-placed event that fans out to in-app + email + sms writes three
 * rows, each tracked independently since one channel can fail while the
 * others succeed.
 */
export interface NotificationDocument {
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
  providerMessageId?: string;
  error?: string;
  attempts: number;
  nextRetryAt?: Date;
  readAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'read'],
      default: 'queued',
    },
    providerMessageId: { type: String },
    error: { type: String },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: Date },
    readAt: { type: Date },
    sentAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, channel: 1, readAt: 1 });
notificationSchema.index({ status: 1, attempts: 1, nextRetryAt: 1 });
// Caps growth of paid-channel history — in-app rows (channel='in_app') are
// exempt since they're the user-visible notification center's data source.
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 180 * 24 * 60 * 60,
    partialFilterExpression: { channel: { $ne: 'in_app' } },
  },
);

export const Notification = model<NotificationDocument>('Notification', notificationSchema);
