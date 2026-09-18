import { logger } from '../../config/logger.js';
import type { EmailAdapter } from './types.js';

/**
 * Fake adapter — Resend isn't wired up yet (a later-phase integration, see
 * docs/INTEGRATIONS.md §2.4). Prints the reset link to the server console
 * instead of emailing it, mirroring the console SMS adapter in
 * `../msg91/consoleAdapter.ts`. The real reset token is still generated,
 * hashed, and stored exactly as it would be in production — only the
 * delivery channel is faked.
 */
export const consoleEmailAdapter: EmailAdapter = {
  sendPasswordResetEmail(email, resetLink) {
    logger.info(`[fake email] Password reset for ${email}: ${resetLink}`);
    return Promise.resolve();
  },
  sendEmail(to, subject) {
    logger.info(`[fake email] To ${to}: ${subject}`);
    return Promise.resolve({ messageId: `fake-${Date.now()}` });
  },
};
