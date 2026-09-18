import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import type { EmailAdapter } from './types.js';

/**
 * Real Resend adapter — only constructed when RESEND_API_KEY is set (see
 * `./index.ts`). NOT yet exercised end-to-end against a real Resend account
 * (no domain/API key at the time this was written — see
 * docs/INTEGRATIONS.md §2.4). Verify the exact request shape against
 * Resend's current API docs before relying on this in production.
 */
export function createResendAdapter(): EmailAdapter {
  async function send(to: string, subject: string, html: string): Promise<{ messageId: string }> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY!}`,
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });

    const body = (await response.json().catch(() => ({}))) as { id?: string };
    if (!response.ok) {
      logger.error({ status: response.status, body, to, subject }, 'Resend send failed');
      throw new Error('EMAIL_PROVIDER_FAILED');
    }
    return { messageId: body.id ?? `resend-${Date.now()}` };
  }

  return {
    async sendPasswordResetEmail(email, resetLink) {
      await send(
        email,
        'Reset your Clenzy password',
        `<p>Click the link below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      );
    },
    sendEmail: send,
  };
}
