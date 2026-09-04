import { placeOrderInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as ordersService from '../services/orders.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const place = asyncHandler(async (req: Request, res: Response) => {
  const input = placeOrderInputSchema.parse(req.body);
  const result = await ordersService.placeOrder(req.user!.id, input);
  res.status(201).json({ success: true, data: result });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const orders = await ordersService.listOrders(req.user!.id);
  res.status(200).json({ success: true, data: { orders } });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.getOrder(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(200).json({ success: true, data: { order } });
});
