import { env } from '../../config/env.js';
import { consoleEmailAdapter } from './consoleAdapter.js';
import { createResendAdapter } from './resendAdapter.js';
import type { EmailAdapter } from './types.js';

export const emailAdapter: EmailAdapter = env.RESEND_API_KEY
  ? createResendAdapter()
  : consoleEmailAdapter;

export type { EmailAdapter };
