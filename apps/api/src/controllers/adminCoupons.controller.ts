import {
  couponListQuerySchema,
  createCouponInputSchema,
  updateCouponInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminCouponsService from '../services/adminCoupons.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const query = couponListQuerySchema.parse(req.query);
  const result = await adminCouponsService.listCouponsAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await adminCouponsService.getCouponAdmin(requireParam(req.params.id, 'id'));
  res.status(200).json({ success: true, data: { coupon } });
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const input = createCouponInputSchema.parse(req.body);
  const coupon = await adminCouponsService.createCoupon(actorOf(req), input);
  res.status(201).json({ success: true, data: { coupon } });
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const input = updateCouponInputSchema.parse(req.body);
  const coupon = await adminCouponsService.updateCoupon(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { coupon } });
});

export const deactivateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await adminCouponsService.deactivateCoupon(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { coupon } });
});

export const getCouponRedemptions = asyncHandler(async (req: Request, res: Response) => {
  const redemptions = await adminCouponsService.getCouponRedemptions(
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { redemptions } });
});
