import {
  cancelOrderInputSchema,
  orderListQuerySchema,
  placeOrderInputSchema,
  rescheduleOrderInputSchema,
  submitReviewInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as ordersService from '../services/orders.service.js';
import { generateInvoicePdf } from '../services/invoice.service.js';
import { getReviewForOrder, submitReview } from '../services/reviews.service.js';
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
  const query = orderListQuerySchema.parse(req.query);
  const result = await ordersService.listOrders(req.user!.id, query);
  res.status(200).json({ success: true, data: result });
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

export const invoice = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = requireParam(req.params.orderNumber, 'orderNumber');
  const pdf = await generateInvoicePdf(req.user!.id, orderNumber);
  res.status(200).set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${orderNumber}-invoice.pdf"`,
  });
  res.send(pdf);
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  const input = submitReviewInputSchema.parse(req.body);
  const result = await submitReview(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
    input,
  );
  res.status(201).json({ success: true, data: { review: result } });
});

export const getReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await getReviewForOrder(
    req.user!.id,
    requireParam(req.params.orderNumber, 'orderNumber'),
  );
  res.status(200).json({ success: true, data: { review: result } });
});
