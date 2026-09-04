/**
 * Seeds `slotTemplates` (windows/capacity/cutoff per
 * docs/PROJECT_REQUIREMENTS.md §7's confirmed launch-decisions table) and
 * one clearly-labeled demo coupon, so the checkout flow (Phase 7) is
 * exercisable end to end without a real ops-configured slot calendar or
 * promo yet. Idempotent: safe to re-run, replaces existing documents.
 *
 * Usage: npm run seed:checkout --workspace=apps/api
 */
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { Coupon } from '../src/models/Coupon.js';
import { SlotTemplate } from '../src/models/SlotTemplate.js';

// Confirmed: docs/PROJECT_REQUIREMENTS.md §7 — "Slot windows: 9–11, 11–1, 2–4, 4–6, 6–8"
// and "Slot capacity: 15 orders per window."
const WINDOWS: { window: string; label: string }[] = [
  { window: '09:00-11:00', label: '9 AM – 11 AM' },
  { window: '11:00-13:00', label: '11 AM – 1 PM' },
  { window: '14:00-16:00', label: '2 PM – 4 PM' },
  { window: '16:00-18:00', label: '4 PM – 6 PM' },
  { window: '18:00-20:00', label: '6 PM – 8 PM' },
];
const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];
const CAPACITY = 15;

async function seed(): Promise<void> {
  await connectDatabase();

  await SlotTemplate.deleteMany({});

  const templates = (['pickup', 'delivery'] as const).flatMap((type) =>
    DAYS_OF_WEEK.flatMap((dayOfWeek) =>
      WINDOWS.map(({ window, label }) => ({
        type,
        dayOfWeek,
        window,
        label,
        capacity: CAPACITY,
        // Lead time before a window's own start; the global 4 PM same-day
        // cutoff (config/slots.ts) applies on top of this — see
        // slots.service.ts's `isSlotCutoffPassed`.
        cutoffMinutesBefore: 60,
        isActive: true,
        areaIds: [],
      })),
    ),
  );
  await SlotTemplate.insertMany(templates);
  logger.info(
    `Seeded ${templates.length} slot templates (${WINDOWS.length} windows × 7 days × 2 types)`,
  );

  await Coupon.deleteMany({ code: 'CLENZY50' });
  await Coupon.create({
    code: 'CLENZY50',
    description: 'DEMO — ₹50 off your first order (testing only, not a real promotion)',
    discountType: 'flat',
    discountValue: 5_000,
    minOrderValue: 29_900,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-01-01'),
    usageLimitPerUser: 1,
    firstOrderOnly: true,
    applicableCategories: [],
    applicableAreas: [],
    restrictedToUsers: [],
    isActive: true,
  });
  logger.info('Seeded demo coupon CLENZY50');

  await disconnectDatabase();
}

seed()
  .then(() => {
    logger.info('Checkout seed complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Checkout seed failed');
    process.exit(1);
  });
