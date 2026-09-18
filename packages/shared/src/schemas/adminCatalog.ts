import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §5-6 and docs/API_SPEC.md §10 "Catalog, pricing, coupons, areas, slots". */

const imageInputSchema = z.object({
  url: z.string().trim().min(1),
  publicId: z.string().trim().optional().default(''),
  alt: z.string().trim().optional().default(''),
});

const seoInputSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(160).optional(),
  keywords: z.array(z.string().trim()).optional(),
});

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  description: z.string().trim().min(1).max(2000),
  shortDescription: z.string().trim().min(1).max(300),
  icon: z.string().trim().min(1),
  image: imageInputSchema.optional(),
  turnaroundHours: z.number().int().positive(),
  expressAvailable: z.boolean().optional().default(false),
  seo: seoInputSchema.optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = createCategoryInputSchema.partial().extend({
  // Not on the create schema (new categories are always active) — PATCH is
  // also how a deactivated category gets reactivated, the inverse of
  // DELETE /admin/services/:id.
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

export const reorderCategoriesInputSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesInputSchema>;

const tieredPricingRowSchema = z.object({
  minQty: z.number().int().positive(),
  /** Paise. */
  unitPrice: z.number().int().nonnegative(),
});

export const createItemInputSchema = z.object({
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  description: z.string().trim().max(2000).optional(),
  careNote: z.string().trim().max(500).optional(),
  unit: z.enum(['piece', 'kg', 'sqft', 'set', 'pair']),
  /** Paise. */
  price: z.number().int().nonnegative(),
  mrp: z.number().int().nonnegative().optional(),
  expressPrice: z.number().int().nonnegative().optional(),
  taxRatePercent: z.number().nonnegative().max(100).optional().default(0),
  hsnCode: z.string().trim().max(20).optional(),
  minQuantity: z.number().int().positive().optional().default(1),
  maxQuantity: z.number().int().positive().optional().default(99),
  turnaroundHours: z.number().int().positive().optional(),
  tieredPricing: z.array(tieredPricingRowSchema).optional(),
  image: imageInputSchema.optional(),
  isPopular: z.boolean().optional().default(false),
  availableInAreas: z.array(z.string().trim().min(1)).optional().default([]),
});
export type CreateItemInput = z.infer<typeof createItemInputSchema>;

export const updateItemInputSchema = createItemInputSchema.partial().extend({
  // Not on the create schema (new items are always active) — lets the
  // items list's inline active toggle PATCH this directly.
  isActive: z.boolean().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

export const itemListQuerySchema = z.object({
  categoryId: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type ItemListQuery = z.infer<typeof itemListQuerySchema>;

export const bulkItemActionInputSchema = z.object({
  itemIds: z.array(z.string().trim().min(1)).min(1),
  action: z.enum(['activate', 'deactivate']),
});
export type BulkItemActionInput = z.infer<typeof bulkItemActionInputSchema>;

export const bulkChangeCategoryInputSchema = z.object({
  itemIds: z.array(z.string().trim().min(1)).min(1),
  categoryId: z.string().trim().min(1),
});
export type BulkChangeCategoryInput = z.infer<typeof bulkChangeCategoryInputSchema>;

export const bulkPriceUpdateInputSchema = z.object({
  itemIds: z.array(z.string().trim().min(1)).min(1),
  mode: z.enum(['percentage', 'flat']),
  /** Percentage: -100..1000 (e.g. 10 = +10%, -15 = -15%). Flat: paise delta, may be negative. */
  value: z.number(),
  reason: z.string().trim().min(1, 'A reason is required for a bulk price change').max(500),
});
export type BulkPriceUpdateInput = z.infer<typeof bulkPriceUpdateInputSchema>;

/** `PATCH /admin/items/bulk-price` per docs/API_SPEC.md §10 — one-shot per-row price edits from the pricing grid. */
export const pricingGridUpdateInputSchema = z.object({
  updates: z
    .array(
      z.object({
        itemId: z.string().trim().min(1),
        price: z.number().int().nonnegative().optional(),
        expressPrice: z.number().int().nonnegative().optional(),
        taxRatePercent: z.number().nonnegative().max(100).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1),
  reason: z.string().trim().min(1, 'A reason is required for a price change').max(500),
});
export type PricingGridUpdateInput = z.infer<typeof pricingGridUpdateInputSchema>;

const csvImportRowSchema = z.object({
  itemId: z.string().trim().min(1),
  price: z.number().int().nonnegative().optional(),
  expressPrice: z.number().int().nonnegative().optional(),
  taxRatePercent: z.number().nonnegative().max(100).optional(),
});

export const csvImportPreviewInputSchema = z.object({
  rows: z.array(csvImportRowSchema).min(1),
});
export type CsvImportPreviewInput = z.infer<typeof csvImportPreviewInputSchema>;

export const csvImportCommitInputSchema = z.object({
  rows: z.array(csvImportRowSchema).min(1),
});
export type CsvImportCommitInput = z.infer<typeof csvImportCommitInputSchema>;
