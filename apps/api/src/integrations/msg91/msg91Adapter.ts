import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import type { SmsAdapter } from './types.js';

/**
 * Real MSG91 adapter — only constructed when MSG91_AUTH_KEY is set (see
 * `./index.ts`). Sends the OTP as a plain transactional SMS via MSG91's Flow
 * API using MSG91_OTP_TEMPLATE_ID, rather than MSG91's own bundled OTP API —
 * this app generates, hashes, stores, and verifies the OTP itself (see
 * docs/SECURITY.md §1 and the `otpRequests` model), so MSG91 is used purely
 * as an SMS transport, not as the OTP authority.
 *
 * NOT yet exercised end-to-end against a real MSG91 account (no DLT
 * registration/API key at the time this was written — see
 * docs/INTEGRATIONS.md §2.3). Verify the exact request shape against MSG91's
 * current Flow API docs before relying on this in production.
 */
export function createMsg91Adapter(): SmsAdapter {
  return {
    async sendOtp(phone, code) {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY! },
        body: JSON.stringify({
          template_id: env.MSG91_OTP_TEMPLATE_ID,
          sender: env.MSG91_SENDER_ID,
          short_url: '0',
          recipients: [{ mobiles: phone.replace('+', ''), OTP: code }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.error({ status: response.status, body }, 'MSG91 send failed');
        throw new Error('SMS_PROVIDER_FAILED');
      }
    },

    async sendTransactionalSms(phone, templateId, variables) {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY! },
        body: JSON.stringify({
          template_id: templateId,
          sender: env.MSG91_SENDER_ID,
          short_url: '0',
          recipients: [{ mobiles: phone.replace('+', ''), ...variables }],
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { request_id?: string };
      if (!response.ok) {
        logger.error(
          { status: response.status, body, templateId },
          'MSG91 transactional SMS failed',
        );
        throw new Error('SMS_PROVIDER_FAILED');
      }
      return { messageId: body.request_id ?? `msg91-${Date.now()}` };
    },
  };
}
