import {
  agentTasksQuerySchema,
  markDeliveredInputSchema,
  markFailedInputSchema,
  markPickedUpInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as agentService from '../services/agent.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = agentTasksQuerySchema.parse(req.query);
  const tasks = await agentService.getAgentTasks(req.user!.id, query.date);
  res.status(200).json({ success: true, data: { tasks } });
});

export const pickedUp = asyncHandler(async (req: Request, res: Response) => {
  const input = markPickedUpInputSchema.parse(req.body);
  await agentService.markPickedUp(req.user!.id, requireParam(req.params.orderId, 'orderId'), input);
  res.status(200).json({ success: true, data: { updated: true } });
});

export const delivered = asyncHandler(async (req: Request, res: Response) => {
  const input = markDeliveredInputSchema.parse(req.body);
  await agentService.markDelivered(
    req.user!.id,
    requireParam(req.params.orderId, 'orderId'),
    input,
  );
  res.status(200).json({ success: true, data: { updated: true } });
});

export const failed = asyncHandler(async (req: Request, res: Response) => {
  const input = markFailedInputSchema.parse(req.body);
  await agentService.markFailed(req.user!.id, requireParam(req.params.orderId, 'orderId'), input);
  res.status(200).json({ success: true, data: { updated: true } });
});
