import {
  createSlotTemplateInputSchema,
  slotCapacityOverrideInputSchema,
  slotCapacityQuerySchema,
  updateSlotTemplateInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminSlotsService from '../services/adminSlots.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const listSlotTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await adminSlotsService.listSlotTemplatesAdmin();
  res.status(200).json({ success: true, data: { templates } });
});

export const createSlotTemplate = asyncHandler(async (req: Request, res: Response) => {
  const input = createSlotTemplateInputSchema.parse(req.body);
  const template = await adminSlotsService.createSlotTemplate(actorOf(req), input);
  res.status(201).json({ success: true, data: { template } });
});

export const updateSlotTemplate = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSlotTemplateInputSchema.parse(req.body);
  const template = await adminSlotsService.updateSlotTemplate(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { template } });
});

export const deactivateSlotTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await adminSlotsService.deactivateSlotTemplate(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { template } });
});

export const getSlotCapacity = asyncHandler(async (req: Request, res: Response) => {
  const query = slotCapacityQuerySchema.parse(req.query);
  const result = await adminSlotsService.getSlotCapacityCalendar(query);
  res.status(200).json({ success: true, data: result });
});

export const overrideSlotCapacity = asyncHandler(async (req: Request, res: Response) => {
  const input = slotCapacityOverrideInputSchema.parse(req.body);
  const capacity = await adminSlotsService.overrideSlotCapacity(actorOf(req), input);
  res.status(200).json({ success: true, data: { capacity } });
});
