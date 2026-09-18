/** No file outside integrations/msg91/ may import an SMS provider's SDK directly — see docs/ARCHITECTURE.md §4. */
export interface SmsAdapter {
  sendOtp(phone: string, code: string): Promise<void>;
  /**
   * One DLT-registered template per notification event — see
   * docs/INTEGRATIONS.md §2.3 and docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2's
   * eight "SMS justified" rows. `templateId` is looked up by event type in
   * `config/notifications.ts`; `variables` must match that template's
   * registered `{#var#}` placeholders exactly or delivery silently fails.
   * Returns the provider's message id for the notification record.
   */
  sendTransactionalSms(
    phone: string,
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{ messageId: string }>;
}
