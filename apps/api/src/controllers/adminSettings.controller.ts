import { updateSettingsInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { getSettings, updateSettings } from '../services/settings.service.js';

function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const getSettingsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSettings();
  res.status(200).json({ success: true, data: { settings } });
});

export const updateSettingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSettingsInputSchema.parse(req.body);
  const settings = await updateSettings(actorOf(req), input);
  res.status(200).json({ success: true, data: { settings } });
});
