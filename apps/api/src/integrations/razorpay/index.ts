import { env } from '../../config/env.js';
import { createConsoleRazorpayAdapter } from './consoleAdapter.js';
import { createRazorpayAdapter } from './razorpayAdapter.js';
import type { PaymentGatewayAdapter } from './types.js';

export const razorpayAdapter: PaymentGatewayAdapter =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? createRazorpayAdapter()
    : createConsoleRazorpayAdapter();

export type { PaymentGatewayAdapter } from './types.js';
