import { env } from '../../config/env.js';
import { consoleSmsAdapter } from './consoleAdapter.js';
import { createMsg91Adapter } from './msg91Adapter.js';
import type { SmsAdapter } from './types.js';

export const smsAdapter: SmsAdapter = env.MSG91_AUTH_KEY ? createMsg91Adapter() : consoleSmsAdapter;

export type { SmsAdapter };
