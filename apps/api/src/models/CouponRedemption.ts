import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "couponRedemptions" — enforces per-user limits, reversed on cancellation. */
export interface CouponRedemptionDocument {
  couponId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  discountAmount: number;
  redeemedAt: Date;
}

const couponRedemptionSchema = new Schema<CouponRedemptionDocument>({
  couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  discountAmount: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now },
});

couponRedemptionSchema.index({ couponId: 1, userId: 1 });

export const CouponRedemption = model<CouponRedemptionDocument>(
  'CouponRedemption',
  couponRedemptionSchema,
);
