/**
 * Confirmed in docs/PROJECT_REQUIREMENTS.md §7's launch-decisions table
 * ("Daily cutoff for same-day pickup — 4:00 PM — ✅"). Belongs in the
 * `settings` collection once that exists (Phase 12) as `sameDayCutoffTime` —
 * see docs/DATABASE.md "settings". Not a placeholder like PRICING_DEFAULTS;
 * owner-signed-off.
 */
export const SLOT_DEFAULTS = {
  /** 16:00 in minutes-since-midnight. */
  sameDayCutoffMinutesOfDay: 16 * 60,
} as const;
