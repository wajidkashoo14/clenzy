import { paymentVerifyInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as paymentsService from '../services/payments.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const input = paymentVerifyInputSchema.parse(req.body);
  const result = await paymentsService.verifyClientPayment(req.user!.id, input);
  res.status(200).json({ success: true, data: result });
});

export const status = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.getPaymentStatus(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(200).json({ success: true, data: result });
});

export const retry = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.retryPayment(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(200).json({ success: true, data: result });
});
