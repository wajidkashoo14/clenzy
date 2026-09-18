import { z } from 'zod';

/** Public catalog + serviceability payload shapes — see docs/DATABASE.md and docs/API_SPEC.md §3–4. */

export const pincodeCheckQuerySchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit pin code'),
});
export type PincodeCheckQuery = z.infer<typeof pincodeCheckQuerySchema>;

const imageSchema = z.object({ url: z.string(), publicId: z.string(), alt: z.string() });

export const serviceItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  careNote: z.string().optional(),
  unit: z.enum(['piece', 'kg', 'sqft', 'set', 'pair']),
  /** Paise. */
  price: z.number().int(),
  mrp: z.number().int().optional(),
  expressPrice: z.number().int().optional(),
  taxRatePercent: z.number(),
  minQuantity: z.number().int(),
  maxQuantity: z.number().int(),
  turnaroundHours: z.number().optional(),
  tieredPricing: z.array(z.object({ minQty: z.number(), unitPrice: z.number() })).optional(),
  image: imageSchema.optional(),
  isPopular: z.boolean(),
});
export type ServiceItemPayload = z.infer<typeof serviceItemSchema>;

export const serviceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  icon: z.string(),
  image: imageSchema.optional(),
  turnaroundHours: z.number(),
  expressAvailable: z.boolean(),
  itemCount: z.number().int().optional(),
  startingPrice: z.number().int().optional(),
  items: z.array(serviceItemSchema).optional(),
});
export type ServiceCategoryPayload = z.infer<typeof serviceCategorySchema>;

export const pricingGroupSchema = z.object({
  category: serviceCategorySchema,
  items: z.array(serviceItemSchema),
});
export type PricingGroupPayload = z.infer<typeof pricingGroupSchema>;

export const serviceAreaSchema = z.object({
  id: z.string(),
  city: z.string(),
  state: z.string(),
  area: z.string(),
  slug: z.string(),
  pickupAvailable: z.boolean(),
  deliveryAvailable: z.boolean(),
  expressAvailable: z.boolean(),
  deliveryFee: z.number().int().optional(),
  minOrderValue: z.number().int().optional(),
});
export type ServiceAreaPayload = z.infer<typeof serviceAreaSchema>;

export const pincodeCheckResultSchema = z.discriminatedUnion('serviceable', [
  z.object({
    serviceable: z.literal(true),
    area: serviceAreaSchema,
  }),
  z.object({
    serviceable: z.literal(false),
    nearestAreas: z.array(serviceAreaSchema),
  }),
]);
export type PincodeCheckResult = z.infer<typeof pincodeCheckResultSchema>;
