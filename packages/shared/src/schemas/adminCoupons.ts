import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §7 and docs/API_SPEC.md §10 "Catalog, pricing, coupons, areas, slots". */

export const createCouponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/i, 'Code may only contain letters, numbers, hyphens, and underscores')
      .transform((v) => v.toUpperCase()),
    description: z.string().trim().min(1).max(300),
    discountType: z.enum(['percentage', 'flat']),
    /** Percent (1-100) for `percentage`, else paise. */
    discountValue: z.number().positive(),
    /** Paise — caps a percentage discount. */
    maxDiscountAmount: z.number().int().positive().optional(),
    /** Paise. */
    minOrderValue: z.number().int().nonnegative().optional().default(0),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
    usageLimitTotal: z.number().int().positive().optional(),
    usageLimitPerUser: z.number().int().positive().optional().default(1),
    firstOrderOnly: z.boolean().optional().default(false),
    applicableCategories: z.array(z.string().trim().min(1)).optional().default([]),
    applicableAreas: z.array(z.string().trim().min(1)).optional().default([]),
    restrictedToUsers: z.array(z.string().trim().min(1)).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .refine((v) => v.validUntil > v.validFrom, {
    message: 'validUntil must be after validFrom',
    path: ['validUntil'],
  })
  .refine((v) => v.discountType !== 'percentage' || v.discountValue <= 100, {
    message: 'A percentage discount cannot exceed 100',
    path: ['discountValue'],
  });
export type CreateCouponInput = z.infer<typeof createCouponInputSchema>;

export const updateCouponInputSchema = z.object({
  description: z.string().trim().min(1).max(300).optional(),
  discountType: z.enum(['percentage', 'flat']).optional(),
  discountValue: z.number().positive().optional(),
  maxDiscountAmount: z.number().int().positive().optional(),
  minOrderValue: z.number().int().nonnegative().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  usageLimitTotal: z.number().int().positive().optional(),
  usageLimitPerUser: z.number().int().positive().optional(),
  firstOrderOnly: z.boolean().optional(),
  applicableCategories: z.array(z.string().trim().min(1)).optional(),
  applicableAreas: z.array(z.string().trim().min(1)).optional(),
  restrictedToUsers: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCouponInput = z.infer<typeof updateCouponInputSchema>;

export const couponListQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type CouponListQuery = z.infer<typeof couponListQuerySchema>;
