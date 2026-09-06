import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §8 and docs/API_SPEC.md §10 "Catalog, pricing, coupons, areas, slots". */

const seoInputSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(160).optional(),
});

export const createAreaInputSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  area: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  pincodes: z
    .array(
      z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'Each pincode must be 6 digits'),
    )
    .min(1),
  pickupAvailable: z.boolean().optional().default(true),
  deliveryAvailable: z.boolean().optional().default(true),
  expressAvailable: z.boolean().optional().default(false),
  /** Paise. */
  deliveryFee: z.number().int().nonnegative().optional(),
  /** Paise. */
  minOrderValue: z.number().int().nonnegative().optional(),
  serviceableCategories: z.array(z.string().trim().min(1)).optional().default([]),
  isActive: z.boolean().optional().default(true),
  seo: seoInputSchema.optional(),
});
export type CreateAreaInput = z.infer<typeof createAreaInputSchema>;

export const updateAreaInputSchema = createAreaInputSchema.partial();
export type UpdateAreaInput = z.infer<typeof updateAreaInputSchema>;

/** `PATCH /admin/areas/:id/availability` — the "pause area" fast toggle (snow days, curfews). */
export const areaAvailabilityInputSchema = z.object({
  pickupAvailable: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
});
export type AreaAvailabilityInput = z.infer<typeof areaAvailabilityInputSchema>;
