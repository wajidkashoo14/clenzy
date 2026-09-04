/**
 * Creates (or resets) one local dev agent account so the mobile agent task
 * view (`/agent/tasks`) is reachable without a staff-facing agent-invite
 * flow — none exists yet (there's deliberately no self-service way to
 * become an agent, per docs/SECURITY.md §1). Idempotent: safe to re-run.
 *
 * Usage: npm run seed:agent --workspace=apps/api
 * Override the defaults: AGENT_EMAIL=you@x.com AGENT_PASSWORD=... npm run seed:agent --workspace=apps/api
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { User } from '../src/models/User.js';

// Matches auth.service.ts's BCRYPT_COST — keep in sync if that ever changes.
const BCRYPT_COST = 12;

const EMAIL = process.env.AGENT_EMAIL ?? 'agent@clenzy.dev';
const PASSWORD = process.env.AGENT_PASSWORD ?? 'ClenzyAgent!2026';
const PHONE = process.env.AGENT_PHONE ?? '+919999999001';

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
        role: 'agent',
        status: 'active',
        name: 'Dev Agent',
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

  logger.info(`Seeded agent account: ${EMAIL} / ${PASSWORD} — sign in at /admin/login`);

  await disconnectDatabase();
}

seed()
  .then(() => {
    logger.info('Agent seed complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Agent seed failed');
    process.exit(1);
  });
