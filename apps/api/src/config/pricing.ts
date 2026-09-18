/**
 * Placeholder pricing rules from docs/PROJECT_REQUIREMENTS.md §7: "The
 * coding model must not invent these values... Placeholder defaults are
 * given so development isn't blocked." They belong in a `settings`
 * collection + admin UI once that exists (Phase 12) — not owner-confirmed,
 * not yet configurable. Do not present these as real Clenzy pricing.
 */
export const PRICING_DEFAULTS = {
  /** ₹299 */
  minOrderValuePaise: 29_900,
  /** Free above ₹499 */
  freeDeliveryThresholdPaise: 49_900,
  /** else ₹49 */
  deliveryFeePaise: 4_900,
  /** +40% of the express-eligible item subtotal */
  expressSurchargeRate: 0.4,
  /** min ₹99 */
  minExpressSurchargePaise: 9_900,
} as const;

/**
 * Confirmed in docs/PROJECT_REQUIREMENTS.md §7's launch-decisions table
 * ("COD maximum order value — ₹5,000 — ✅") — unlike `PRICING_DEFAULTS`
 * above, this one is owner-signed-off, not a placeholder.
 */
export const COD_MAX_ORDER_VALUE_PAISE = 500_000;
