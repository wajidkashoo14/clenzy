/** No file outside integrations/resend/ may import an email provider's SDK directly — see docs/ARCHITECTURE.md §4. */
export interface EmailAdapter {
  sendPasswordResetEmail(email: string, resetLink: string): Promise<void>;
  /** Generic transactional send — used by NotificationService for every event's email template. */
  sendEmail(to: string, subject: string, html: string): Promise<{ messageId: string }>;
}
