import {
  cancelOrderInputSchema,
  placeOrderInputSchema,
  rescheduleOrderInputSchema,
} from '@clenzy/shared';
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

export const track = asyncHandler(async (req: Request, res: Response) => {
  const result = await ordersService.trackOrder(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(200).json({ success: true, data: result });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const input = cancelOrderInputSchema.parse(req.body);
  const order = await ordersService.cancelOrder(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
    input.reason,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  const input = rescheduleOrderInputSchema.parse(req.body);
  const order = await ordersService.rescheduleOrder(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
    input,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const reclean = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.requestReclean(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(201).json({ success: true, data: { order } });
});

export const approveRevision = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.approveRevision(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(200).json({ success: true, data: { order } });
});
