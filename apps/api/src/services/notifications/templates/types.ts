/**
 * What one template builder produces for a single event — the
 * NotificationService writes one Notification row per key present here
 * (in-app is always present; email/sms are omitted when the matrix doesn't
 * allow the channel for that event). `sms.variables` must match the
 * DLT-registered template's `{#var#}` placeholders exactly once a real
 * template id exists — see config/notifications.ts.
 */
export interface NotificationContent {
  inApp: { title: string; body: string };
  email?: { subject: string; html: string };
  sms?: { text: string; variables: Record<string, string> };
}

export function orderTrackLink(orderNumber: string, webAppUrl: string): string {
  return `${webAppUrl}/account/orders/${orderNumber}`;
}
