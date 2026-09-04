import { couponValidateInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as couponsService from '../services/coupons.service.js';

export const validate = asyncHandler(async (req: Request, res: Response) => {
  const input = couponValidateInputSchema.parse(req.body);
  const result = await couponsService.validateCoupon(req.user!.id, input);
  res.status(200).json({ success: true, data: result });
});
