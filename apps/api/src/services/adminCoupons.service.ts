import type { CouponListQuery, CreateCouponInput, UpdateCouponInput } from '@clenzy/shared';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { Coupon, type CouponDocument } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { logAudit } from './auditLog.service.js';
import { AppError } from '../utils/AppError.js';

type CouponLean = CouponDocument & { _id: unknown };

interface Actor {
  id: string;
  role: string;
}

export async function listCouponsAdmin(
  query: CouponListQuery,
): Promise<{ coupons: CouponLean[]; total: number; page: number; pageSize: number }> {
  const filter: FilterQuery<CouponDocument> = {};
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  if (query.q) filter.code = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const skip = (query.page - 1) * query.pageSize;
  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    Coupon.countDocuments(filter),
  ]);
  return { coupons, total, page: query.page, pageSize: query.pageSize };
}

export async function getCouponAdmin(id: string): Promise<CouponLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Coupon not found.');
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) throw AppError.notFound('Coupon not found.');
  return coupon;
}

export async function createCoupon(actor: Actor, input: CreateCouponInput): Promise<CouponLean> {
  const existing = await Coupon.findOne({ code: input.code }).lean();
  if (existing)
    throw AppError.badRequest('CODE_TAKEN', `The code "${input.code}" is already in use.`);

  const coupon = await Coupon.create({ ...input, createdBy: actor.id });

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'coupon.create',
    entityType: 'Coupon',
    entityId: String(coupon._id),
    after: coupon.toObject(),
  });
  return coupon.toObject();
}

export async function updateCoupon(
  actor: Actor,
  id: string,
  input: UpdateCouponInput,
): Promise<CouponLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Coupon not found.');
  const coupon = await Coupon.findById(id);
  if (!coupon) throw AppError.notFound('Coupon not found.');

  const before = coupon.toObject();
  Object.assign(coupon, input);
  await coupon.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'coupon.update',
    entityType: 'Coupon',
    entityId: id,
    before,
    after: coupon.toObject(),
  });
  return coupon.toObject();
}

/** Deactivate rather than delete once a coupon has been redeemed — see docs/ADMIN_DASHBOARD.md §7. */
export async function deactivateCoupon(actor: Actor, id: string): Promise<CouponLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Coupon not found.');
  const coupon = await Coupon.findById(id);
  if (!coupon) throw AppError.notFound('Coupon not found.');

  const before = coupon.toObject();
  coupon.isActive = false;
  await coupon.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'coupon.deactivate',
    entityType: 'Coupon',
    entityId: id,
    before,
    after: coupon.toObject(),
  });
  return coupon.toObject();
}

export async function getCouponRedemptions(couponId: string) {
  if (!isValidObjectId(couponId)) throw AppError.notFound('Coupon not found.');
  return CouponRedemption.find({ couponId })
    .sort({ redeemedAt: -1 })
    .populate<{ userId: { _id: unknown; name?: string; phone: string } | null }>(
      'userId',
      'name phone',
    )
    .populate<{ orderId: { _id: unknown; orderNumber: string } | null }>('orderId', 'orderNumber')
    .lean();
}
