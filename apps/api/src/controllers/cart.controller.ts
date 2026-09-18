import { cartEstimateInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as cartService from '../services/cart.service.js';

export const estimate = asyncHandler(async (req: Request, res: Response) => {
  const input = cartEstimateInputSchema.parse(req.body);
  const result = await cartService.estimateCart(input);
  res.status(200).json({ success: true, data: result });
});
