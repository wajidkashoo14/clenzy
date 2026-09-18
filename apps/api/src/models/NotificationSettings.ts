import type { NotificationType } from '@clenzy/shared';
import { Schema, model } from 'mongoose';

/**
 * A single document (`_id: 'global'`) holding per-event email/SMS channel
 * toggles — see docs/PAYMENTS_AND_NOTIFICATIONS.md §3.1: "each channel is
 * individually toggleable per event in admin settings so the owner can tune
 * spend without a deploy." No admin UI exists yet (Phase 12); this backs the
 * `PATCH /admin/notifications/settings` endpoint added in Phase 10. Missing
 * or unset entries default to enabled — see notificationSettings.service.ts.
 */
export interface NotificationSettingsDocument {
  _id: string;
  toggles: Partial<Record<NotificationType, { email?: boolean; sms?: boolean }>>;
}

const notificationSettingsSchema = new Schema<NotificationSettingsDocument>({
  _id: { type: String, required: true },
  toggles: { type: Schema.Types.Mixed, default: {} },
});

export const NotificationSettings = model<NotificationSettingsDocument>(
  'NotificationSettings',
  notificationSettingsSchema,
);
