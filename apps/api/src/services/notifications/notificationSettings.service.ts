import type {
  NotificationSettingsInput,
  NotificationSettingsResult,
  NotificationType,
} from '@clenzy/shared';
import { ADMIN_TOGGLEABLE_TYPES } from '@clenzy/shared';
import { NotificationSettings } from '../../models/NotificationSettings.js';

const SETTINGS_ID = 'global';

/** See docs/API_SPEC.md §10 and PAYMENTS_AND_NOTIFICATIONS.md §3.1. Missing entries default to enabled. */
export async function getNotificationSettings(): Promise<NotificationSettingsResult> {
  const doc = await NotificationSettings.findById(SETTINGS_ID).lean();
  const toggles: NotificationSettingsResult['toggles'] = {};
  for (const type of ADMIN_TOGGLEABLE_TYPES) {
    toggles[type] = {
      email: doc?.toggles?.[type]?.email ?? true,
      sms: doc?.toggles?.[type]?.sms ?? true,
    };
  }
  return { toggles };
}

export async function setNotificationSetting(input: NotificationSettingsInput): Promise<void> {
  await NotificationSettings.findByIdAndUpdate(
    SETTINGS_ID,
    { $set: { [`toggles.${input.type}.${input.channel}`]: input.enabled } },
    { upsert: true },
  );
}

export function isToggleableType(type: NotificationType): boolean {
  return ADMIN_TOGGLEABLE_TYPES.includes(type);
}
