import {
  addInternalNoteInputSchema,
  adminCancelOrderInputSchema,
  adminOrderListQuerySchema,
  assignAgentInputSchema,
  bulkAssignRosterInputSchema,
  createManualOrderInputSchema,
  dashboardQuerySchema,
  notificationSettingsInputSchema,
  orderRosterQuerySchema,
  refundInputSchema,
  rescheduleOrderInputSchema,
  reviseOrderItemsInputSchema,
  updateOrderStatusInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as adminOrdersService from '../services/adminOrders.service.js';
import * as dashboardService from '../services/dashboard.service.js';
import * as notificationSettingsService from '../services/notifications/notificationSettings.service.js';
import * as paymentsService from '../services/payments.service.js';
import * as staffService from '../services/staff.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const refundOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = refundInputSchema.parse(req.body);
  const result = await paymentsService.refundOrder(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: result });
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = adminOrderListQuerySchema.parse(req.query);
  const result = await adminOrdersService.listOrdersAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = createManualOrderInputSchema.parse(req.body);
  const order = await adminOrdersService.createManualOrder(req.user!.id, input);
  res.status(201).json({ success: true, data: { order } });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await adminOrdersService.getOrderAdmin(
    requireParam(req.params.id, 'id'),
    req.user!.role,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = updateOrderStatusInputSchema.parse(req.body);
  const order = await adminOrdersService.updateOrderStatus(
    req.user!.role,
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const assign = asyncHandler(async (req: Request, res: Response) => {
  const input = assignAgentInputSchema.parse(req.body);
  const order = await adminOrdersService.assignAgent(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  const input = rescheduleOrderInputSchema.parse(req.body);
  const order = await adminOrdersService.rescheduleOrderAdmin(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const input = addInternalNoteInputSchema.parse(req.body);
  const order = await adminOrdersService.addInternalNote(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input.note,
  );
  res.status(201).json({ success: true, data: { order } });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = adminCancelOrderInputSchema.parse(req.body);
  const order = await adminOrdersService.cancelOrderAdmin(
    req.user!.id,
    req.user!.role,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const reviseItems = asyncHandler(async (req: Request, res: Response) => {
  const input = reviseOrderItemsInputSchema.parse(req.body);
  const order = await adminOrdersService.reviseOrderItems(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { order } });
});

export const roster = asyncHandler(async (req: Request, res: Response) => {
  const query = orderRosterQuerySchema.parse(req.query);
  const orders = await adminOrdersService.getOrderRoster(query);
  res.status(200).json({ success: true, data: { orders } });
});

export const bulkAssignRoster = asyncHandler(async (req: Request, res: Response) => {
  const input = bulkAssignRosterInputSchema.parse(req.body);
  const orders = await adminOrdersService.bulkAssignRosterWindow(req.user!.id, input);
  res.status(200).json({ success: true, data: { orders } });
});

export const listAgents = asyncHandler(async (_req: Request, res: Response) => {
  const agents = await staffService.listAgents();
  res.status(200).json({ success: true, data: { agents } });
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const query = dashboardQuerySchema.parse(req.query);
  const result = await dashboardService.getDashboard(query);
  res.status(200).json({ success: true, data: result });
});

export const getNotificationSettings = asyncHandler(async (_req: Request, res: Response) => {
  const result = await notificationSettingsService.getNotificationSettings();
  res.status(200).json({ success: true, data: result });
});

export const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  const input = notificationSettingsInputSchema.parse(req.body);
  if (!notificationSettingsService.isToggleableType(input.type)) {
    throw AppError.badRequest('NOT_TOGGLEABLE', `"${input.type}" has no paid channel to toggle.`);
  }
  await notificationSettingsService.setNotificationSetting(input);
  res.status(200).json({ success: true, data: { updated: true } });
});
