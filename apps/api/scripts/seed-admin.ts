/**
 * Creates (or resets) one local dev admin account so `/admin/login` and
 * ADMIN-only endpoints (e.g. POST /admin/orders/:id/refund) are reachable
 * without an admin dashboard or self-service signup — there's deliberately
 * no way to become admin through the app itself (docs/SECURITY.md §1: role
 * escalation must never be self-service). Idempotent: safe to re-run.
 *
 * Usage: npm run seed:admin --workspace=apps/api
 * Override the defaults: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... npm run seed:admin --workspace=apps/api
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { User } from '../src/models/User.js';

// Matches auth.service.ts's BCRYPT_COST — keep in sync if that ever changes.
const BCRYPT_COST = 12;

const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@clenzy.dev';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'ClenzyAdmin!2026';
const PHONE = process.env.ADMIN_PHONE ?? '+919999999000';

async function seed(): Promise<void> {
  await connectDatabase();

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_COST);

  await User.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        email: EMAIL,
        emailVerified: true,
        passwordHash,
        role: 'admin',
        status: 'active',
        name: 'Dev Admin',
        loginAttempts: 0,
        lockedUntil: undefined,
      },
      $setOnInsert: {
        phone: PHONE,
        phoneVerified: true,
      },
    },
    { upsert: true },
  );

  logger.info(`Seeded admin account: ${EMAIL} / ${PASSWORD} — sign in at /admin/login`);

  await disconnectDatabase();
}

seed()
  .then(() => {
    logger.info('Admin seed complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Admin seed failed');
    process.exit(1);
  });
