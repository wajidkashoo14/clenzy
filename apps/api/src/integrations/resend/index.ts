import { consoleEmailAdapter } from './consoleAdapter.js';
import type { EmailAdapter } from './types.js';

// No RESEND_API_KEY exists yet — always the console fake for now. Follows
// the same env-gated pattern as ../msg91/index.ts once Resend is set up.
export const emailAdapter: EmailAdapter = consoleEmailAdapter;

export type { EmailAdapter };
