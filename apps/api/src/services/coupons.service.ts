import type { CouponValidateInput, CouponValidateResult } from '@clenzy/shared';
import type { ClientSession } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import { Coupon, type CouponDocument } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Order } from '../models/Order.js';
import { ServiceItem } from '../models/ServiceItem.js';
import { AppError } from '../utils/AppError.js';

type CouponLean = CouponDocument & { _id: unknown };

export interface CouponValidationInput {
  code: string;
  userId: string;
  /** Category ids present in the cart — used for `applicableCategories`. */
  categoryIds: string[];
  areaId?: string;
  /** Paise. */
  subtotal: number;
  session?: ClientSession;
}

export interface CouponValidationOutcome {
  coupon: CouponLean;
  /** Paise. */
  discountAmount: number;
}

function computeDiscount(coupon: CouponLean, subtotal: number): number {
  if (coupon.discountType === 'flat') {
    return Math.min(coupon.discountValue, subtotal);
  }
  const raw = Math.round((subtotal * coupon.discountValue) / 100);
  return coupon.maxDiscountAmount != null ? Math.min(raw, coupon.maxDiscountAmount) : raw;
}

/**
 * The single coupon-eligibility authority — called both by the advisory
 * `POST /coupons/validate` endpoint and, inside the order transaction, by
 * `orders.service.ts`. See docs/API_SPEC.md §6: "Validation here is
 * advisory; it is re-run authoritatively at order placement."
 */
export async function validateCouponCore(
  input: CouponValidationInput,
): Promise<CouponValidationOutcome> {
  const code = input.code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code, isActive: true })
    .session(input.session ?? null)
    .lean();

  if (
    !coupon ||
    (coupon.restrictedToUsers.length > 0 &&
      !coupon.restrictedToUsers.some((id) => String(id) === input.userId))
  ) {
    throw AppError.notFound('This coupon code is invalid.');
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    throw AppError.unprocessable('COUPON_NOT_STARTED', 'This coupon is not active yet.');
  }
  if (now > coupon.validUntil) {
    throw AppError.unprocessable('COUPON_EXPIRED', 'This coupon has expired.');
  }

  if (input.subtotal < coupon.minOrderValue) {
    throw AppError.unprocessable(
      'COUPON_MIN_ORDER_NOT_MET',
      `Add ₹${((coupon.minOrderValue - input.subtotal) / 100).toFixed(0)} more to use this coupon.`,
      undefined,
      { shortfallAmount: coupon.minOrderValue - input.subtotal },
    );
  }

  if (coupon.usageLimitTotal != null && coupon.usedCount >= coupon.usageLimitTotal) {
    throw AppError.unprocessable(
      'COUPON_USAGE_LIMIT_REACHED',
      'This coupon has reached its usage limit.',
    );
  }

  const usedByUser = await CouponRedemption.countDocuments({
    couponId: coupon._id,
    userId: input.userId,
  }).session(input.session ?? null);
  if (usedByUser >= coupon.usageLimitPerUser) {
    throw AppError.unprocessable('COUPON_ALREADY_USED_BY_USER', "You've already used this coupon.");
  }

  if (coupon.firstOrderOnly) {
    const hasOrdered = await Order.exists({ userId: input.userId }).session(input.session ?? null);
    if (hasOrdered) {
      throw AppError.unprocessable(
        'COUPON_FIRST_ORDER_ONLY',
        'This coupon is for first orders only.',
      );
    }
  }

  if (
    coupon.applicableCategories.length > 0 &&
    !input.categoryIds.every((id) =>
      coupon.applicableCategories.some((catId) => String(catId) === id),
    )
  ) {
    throw AppError.unprocessable(
      'COUPON_NOT_APPLICABLE_TO_ITEMS',
      'This coupon does not apply to everything in your cart.',
    );
  }

  if (
    coupon.applicableAreas.length > 0 &&
    (!input.areaId || !coupon.applicableAreas.some((areaId) => String(areaId) === input.areaId))
  ) {
    throw AppError.unprocessable(
      'COUPON_NOT_APPLICABLE_TO_ITEMS',
      'This coupon is not valid in your delivery area.',
    );
  }

  return { coupon, discountAmount: computeDiscount(coupon, input.subtotal) };
}

/** See docs/API_SPEC.md §6 — POST /coupons/validate. */
export async function validateCoupon(
  userId: string,
  input: CouponValidateInput,
): Promise<CouponValidateResult> {
  const itemIds = input.items.map((line) => line.serviceItemId);
  const invalidId = itemIds.find((id) => !isValidObjectId(id));
  if (invalidId) throw AppError.notFound('One of the items in your cart was not found.');

  const dbItems = await ServiceItem.find({ _id: { $in: itemIds } }, { categoryId: 1 }).lean();
  const categoryIds = [...new Set(dbItems.map((item) => String(item.categoryId)))];

  const { coupon, discountAmount } = await validateCouponCore({
    code: input.code,
    userId,
    categoryIds,
    areaId: input.areaId,
    subtotal: input.subtotal,
  });

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountAmount,
    newTotal: input.subtotal - discountAmount,
  };
}
