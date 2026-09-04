import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "coupons". */
export interface CouponDocument {
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  /** Percent (1-100) for `percentage`, else paise. */
  discountValue: number;
  /** Paise. Caps a percentage discount. */
  maxDiscountAmount?: number;
  /** Paise. */
  minOrderValue: number;
  validFrom: Date;
  validUntil: Date;
  usageLimitTotal?: number;
  usageLimitPerUser: number;
  usedCount: number;
  firstOrderOnly: boolean;
  applicableCategories: Types.ObjectId[];
  applicableAreas: Types.ObjectId[];
  restrictedToUsers: Types.ObjectId[];
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<CouponDocument>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    minOrderValue: { type: Number, default: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usageLimitTotal: { type: Number },
    usageLimitPerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    firstOrderOnly: { type: Boolean, default: false },
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    applicableAreas: [{ type: Schema.Types.ObjectId, ref: 'ServiceArea' }],
    restrictedToUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, validUntil: 1 });

export const Coupon = model<CouponDocument>('Coupon', couponSchema);
