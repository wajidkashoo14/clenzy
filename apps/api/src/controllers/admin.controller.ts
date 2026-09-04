import { refundInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as paymentsService from '../services/payments.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

/** See docs/API_SPEC.md §10 — POST /admin/orders/:id/refund. ADMIN only, full or partial. */
export const refundOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = refundInputSchema.parse(req.body);
  const result = await paymentsService.refundOrder(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: result });
});
