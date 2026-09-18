import type { NotificationListResult, NotificationPreferencesInput } from '@clenzy/shared';
import { apiGet, apiPatch } from '@/lib/api-client';

export function listNotifications(unreadOnly = false): Promise<NotificationListResult> {
  return apiGet(`/api/v1/notifications?unreadOnly=${unreadOnly}`);
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiGet('/api/v1/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<{ updated: boolean }> {
  return apiPatch(`/api/v1/notifications/${id}/read`, {});
}

export function markAllNotificationsRead(): Promise<{ updated: boolean }> {
  return apiPatch('/api/v1/notifications/read-all', {});
}

export function updateNotificationPreferences(
  input: NotificationPreferencesInput,
): Promise<{ updated: boolean }> {
  return apiPatch('/api/v1/notifications/preferences', input);
}
