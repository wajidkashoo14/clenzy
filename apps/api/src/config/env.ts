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
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
  // Optional — see apps/api/src/integrations/msg91/index.ts. Unset means the
  // console-logging fake adapter is used (no DLT registration yet; see
  // docs/DEVELOPMENT_PLAN.md Phase 4).
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
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

  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
