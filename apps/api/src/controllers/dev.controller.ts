import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as devPaymentSimulator from '../services/devPaymentSimulator.service.js';

const simulatePaymentInputSchema = z.object({
  orderNumber: z.string().trim().min(1),
  outcome: z.enum(['success', 'failure']),
});

export const simulatePayment = asyncHandler(async (req: Request, res: Response) => {
  const input = simulatePaymentInputSchema.parse(req.body);
  const result = await devPaymentSimulator.simulatePayment(
    req.user!.id,
    input.orderNumber,
    input.outcome,
  );
  res.status(200).json({ success: true, data: result });
});
