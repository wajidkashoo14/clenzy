import { logger } from '../../config/logger.js';
import type { SmsAdapter } from './types.js';

/**
 * Fake adapter used until MSG91's DLT registration lands — see
 * docs/INTEGRATIONS.md §2.3 and docs/DEVELOPMENT_PLAN.md Phase 4. Prints the
 * OTP to the server console instead of sending a real SMS. Swapping in
 * `msg91Adapter` once MSG91_AUTH_KEY is set is the only change needed —
 * nothing else in the codebase should know which adapter is active.
 */
export const consoleSmsAdapter: SmsAdapter = {
  sendOtp(phone, code) {
    logger.info(`[fake SMS] OTP for ${phone}: ${code}`);
    return Promise.resolve();
  },
  sendTransactionalSms(phone, templateId, variables) {
    logger.info({ phone, templateId, variables }, '[fake SMS] transactional');
    return Promise.resolve({ messageId: `fake-${Date.now()}` });
  },
};
