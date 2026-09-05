import { z } from 'zod';

/**
 * Validated environment configuration. The server refuses to start if any
 * required variable is missing or malformed — see docs/ARCHITECTURE.md §6
 * and docs/AI_CODING_RULES.md §3. Extend this schema in the same PR that
 * introduces the first real consumer of a new variable (e.g. add
 * RAZORPAY_KEY_ID here when Phase 8 wires up payments) — don't pre-declare
 * variables nothing reads yet.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required — see docs/INTEGRATIONS.md §2.1 to create an Atlas cluster.')
    .startsWith('mongodb', 'MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string.'),
  CORS_ORIGINS: z
    .string()
    .min(1, 'CORS_ORIGINS is required, e.g. "http://localhost:3000".')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  COOKIE_DOMAIN: z.string().default('localhost'),
  // The customer-facing web app's origin — used to build absolute deep links
  // in emails/SMS (a relative path breaks once the recipient isn't already
  // on the site). See docs/PAYMENTS_AND_NOTIFICATIONS.md §3.3.
  WEB_APP_URL: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
  // Optional — see apps/api/src/integrations/msg91/index.ts. Unset means the
  // console-logging fake adapter is used (no DLT registration yet; see
  // docs/DEVELOPMENT_PLAN.md Phase 4).
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  // One DLT-registered template id per "SMS justified" notification event —
  // see docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2 and config/notifications.ts.
  // Unset means that event's SMS is skipped (in-app/email still send) —
  // DLT template approval is an external dependency, not a code one; see
  // docs/DEVELOPMENT_PLAN.md Phase 10 "Dependencies".
  MSG91_TEMPLATE_ORDER_PLACED: z.string().optional(),
  MSG91_TEMPLATE_PAYMENT_FAILED: z.string().optional(),
  MSG91_TEMPLATE_PICKUP_REMINDER: z.string().optional(),
  MSG91_TEMPLATE_PRICE_REVISION: z.string().optional(),
  MSG91_TEMPLATE_OUT_FOR_DELIVERY: z.string().optional(),
  MSG91_TEMPLATE_PICKUP_DELIVERY_FAILED: z.string().optional(),
  MSG91_TEMPLATE_ORDER_CANCELLED: z.string().optional(),
  MSG91_TEMPLATE_REFUND_COMPLETED: z.string().optional(),
  // Optional — see apps/api/src/integrations/resend/index.ts. Unset means
  // the console-logging fake adapter is used (no domain/API key yet; see
  // docs/INTEGRATIONS.md §2.4).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Clenzy <orders@clenzy.dev>'),
  // Optional — see apps/api/src/integrations/razorpay/index.ts. Unset means
  // the console-logging fake adapter is used (KYC pending; see
  // docs/DEVELOPMENT_PLAN.md Phase 8 and docs/INTEGRATIONS.md §2.2).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // Needed even with the fake adapter — it signs/verifies simulated webhooks
  // the same way a real one would, so that code path is genuinely exercised.
  RAZORPAY_WEBHOOK_SECRET: z.string().default('dev-webhook-secret-not-for-production-use'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // console.error (not the pino logger, which isn't configured yet at this point in boot) —
    // allowed by the no-console rule.
    console.error('\n✖ Invalid environment configuration:\n');
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\nCopy apps/api/.env.example to apps/api/.env and fill in real values.\n');
    process.exit(1);
  }

  // See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.7: "Use test keys in dev/staging
  // and live keys only in production — enforce this in config/env.ts by
  // rejecting a live key when NODE_ENV !== 'production'." Checked both ways —
  // a live key is just as dangerous outside prod as a test key is inside it.
  const isLiveKey = parsed.data.RAZORPAY_KEY_ID?.startsWith('rzp_live_');
  if (isLiveKey && parsed.data.NODE_ENV !== 'production') {
    console.error(`\n✖ RAZORPAY_KEY_ID is a live key but NODE_ENV=${parsed.data.NODE_ENV}.\n`);
    process.exit(1);
  }
  if (!isLiveKey && parsed.data.RAZORPAY_KEY_ID && parsed.data.NODE_ENV === 'production') {
    console.error('\n✖ RAZORPAY_KEY_ID is a test key (rzp_test_...) but NODE_ENV=production.\n');
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
