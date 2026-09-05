import { z } from 'zod';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '../constants/notifications.js';

/** See docs/API_SPEC.md §9 "Notifications". */

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(NOTIFICATION_CHANNELS),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['queued', 'sent', 'delivered', 'failed', 'read']),
  readAt: z.string().optional(),
  createdAt: z.string(),
});
export type NotificationPayload = z.infer<typeof notificationSchema>;

export const notificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationListResultSchema = z.object({
  notifications: z.array(notificationSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type NotificationListResult = z.infer<typeof notificationListResultSchema>;

/** Only the in-app-relevant preferences are user-editable; `in_app` itself can't be opted out of. */
export const notificationPreferencesInputSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  push: z.boolean().optional(),
  marketing: z.boolean().optional(),
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesInputSchema>;

/** ADMIN — per-event channel toggles for cost control. See PAYMENTS_AND_NOTIFICATIONS.md §3.1. */
export const notificationSettingsInputSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(['email', 'sms']),
  enabled: z.boolean(),
});
export type NotificationSettingsInput = z.infer<typeof notificationSettingsInputSchema>;

export const notificationSettingsResultSchema = z.object({
  toggles: z.record(z.string(), z.object({ email: z.boolean(), sms: z.boolean() })),
});
export type NotificationSettingsResult = z.infer<typeof notificationSettingsResultSchema>;
