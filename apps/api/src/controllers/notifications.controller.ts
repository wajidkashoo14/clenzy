import { notificationListQuerySchema, notificationPreferencesInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as notificationsService from '../services/notifications/inAppNotifications.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = notificationListQuerySchema.parse(req.query);
  const result = await notificationsService.listNotifications(req.user!.id, query);
  res.status(200).json({ success: true, data: result });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await notificationsService.getUnreadCount(req.user!.id);
  res.status(200).json({ success: true, data: { count } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markNotificationRead(req.user!.id, requireParam(req.params.id, 'id'));
  res.status(200).json({ success: true, data: { updated: true } });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markAllNotificationsRead(req.user!.id);
  res.status(200).json({ success: true, data: { updated: true } });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const input = notificationPreferencesInputSchema.parse(req.body);
  await notificationsService.updateNotificationPreferences(req.user!.id, input);
  res.status(200).json({ success: true, data: { updated: true } });
});
