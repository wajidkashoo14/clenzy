import {
  areaAvailabilityInputSchema,
  createAreaInputSchema,
  updateAreaInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminAreasService from '../services/adminAreas.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const listAreas = asyncHandler(async (_req: Request, res: Response) => {
  const areas = await adminAreasService.listAreasAdmin();
  res.status(200).json({ success: true, data: { areas } });
});

export const getArea = asyncHandler(async (req: Request, res: Response) => {
  const area = await adminAreasService.getAreaAdmin(requireParam(req.params.id, 'id'));
  res.status(200).json({ success: true, data: { area } });
});

export const createArea = asyncHandler(async (req: Request, res: Response) => {
  const input = createAreaInputSchema.parse(req.body);
  const area = await adminAreasService.createArea(actorOf(req), input);
  res.status(201).json({ success: true, data: { area } });
});

export const updateArea = asyncHandler(async (req: Request, res: Response) => {
  const input = updateAreaInputSchema.parse(req.body);
  const area = await adminAreasService.updateArea(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { area } });
});

export const setAreaAvailability = asyncHandler(async (req: Request, res: Response) => {
  const input = areaAvailabilityInputSchema.parse(req.body);
  const area = await adminAreasService.setAreaAvailability(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { area } });
});

export const deactivateArea = asyncHandler(async (req: Request, res: Response) => {
  const area = await adminAreasService.deactivateArea(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { area } });
});
